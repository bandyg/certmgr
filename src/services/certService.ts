import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync, readdirSync, unlinkSync } from 'fs';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { caClient } from './caClient';
import { pfxService, DecryptedPfx } from './pfxService';
import { auditService } from './auditService';

export interface CertificateStoreResult {
  success: boolean;
  version?: string;
  error?: string;
}

export class CertService {
  private logger = getLogger();

  private getClientCertsDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'clientCerts');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private getCaCertsDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'CACerts');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private getMetaDataDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'metaData');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private getTempDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'temp');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private backupExistingCertificates(): string | null {
    const clientCertsDir = this.getClientCertsDir();
    const caCertsDir = this.getCaCertsDir();
    const metaDataDir = this.getMetaDataDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(metaDataDir, `backup-${timestamp}`);

    let hasBackups = false;

    if (existsSync(clientCertsDir)) {
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      
      const files = readdirSync(clientCertsDir);
      for (const file of files) {
        const srcPath = join(clientCertsDir, file);
        const destPath = join(backupDir, file);
        copyFileSync(srcPath, destPath);
        hasBackups = true;
      }
    }

    if (existsSync(caCertsDir)) {
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      }
      
      const files = readdirSync(caCertsDir);
      for (const file of files) {
        const srcPath = join(caCertsDir, file);
        const destPath = join(backupDir, `ca-${file}`);
        copyFileSync(srcPath, destPath);
        hasBackups = true;
      }
    }

    if (hasBackups) {
      this.logger.info(`Backed up existing certificates to: ${backupDir}`);
      return backupDir;
    }

    return null;
  }

  async fetchAndStoreCertificate(password: string): Promise<CertificateStoreResult> {
    this.logger.info('Starting certificate fetch and store workflow');

    const fetchResult = await caClient.fetchPfx();

    if (!fetchResult.success || !fetchResult.filePath) {
      this.logger.error(`Failed to fetch PFX: ${fetchResult.error}`);
      auditService.logFetch(false, undefined, fetchResult.error);
      return {
        success: false,
        error: fetchResult.error || 'Failed to fetch PFX',
      };
    }

    auditService.logFetch(true);

    const decryptResult = await pfxService.decryptPfx(fetchResult.filePath, password);

    if (!decryptResult.success || !decryptResult.data) {
      this.logger.error(`Failed to decrypt PFX: ${decryptResult.error}`);
      auditService.log('DECRYPT', 'FAILURE', { error: decryptResult.error });
      return {
        success: false,
        error: decryptResult.error || 'Failed to decrypt PFX',
      };
    }

    auditService.log('DECRYPT', 'SUCCESS', { filename: fetchResult.filePath });

    return this.storeCertificates(decryptResult.data);
  }

  async storeCertificates(decrypted: DecryptedPfx): Promise<CertificateStoreResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const version = `v-${timestamp}`;

    this.logger.info(`Storing certificates with version: ${version}`);

    const backupDir = this.backupExistingCertificates();

    try {
      const clientCertsDir = this.getClientCertsDir();
      const caCertsDir = this.getCaCertsDir();

      const certPath = join(clientCertsDir, 'client.crt');
      writeFileSync(certPath, decrypted.cert, { mode: 0o644 });
      this.logger.info(`Certificate saved to: ${certPath}`);

      if (decrypted.key) {
        const keyPath = join(clientCertsDir, 'client.key');
        writeFileSync(keyPath, decrypted.key, { mode: 0o600 });
        chmodSync(keyPath, 0o600);
        this.logger.info(`Private key saved with 0600 permissions: ${keyPath}`);
      }

      if (decrypted.ca) {
        const caPath = join(caCertsDir, 'ca-chain.crt');
        writeFileSync(caPath, decrypted.ca, { mode: 0o644 });
        this.logger.info(`CA chain saved to: ${caPath}`);
      }

      this.logger.info(`Certificates stored successfully. Version: ${version}`);
      auditService.logStore(true, version);

      return {
        success: true,
        version,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store certificates: ${errorMessage}`);
      auditService.logStore(false, version, errorMessage);

      if (backupDir) {
        this.logger.warn('Restore from backup may be needed');
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getCertificatePaths() {
    return {
      clientCert: join(this.getClientCertsDir(), 'client.crt'),
      clientKey: join(this.getClientCertsDir(), 'client.key'),
      caChain: join(this.getCaCertsDir(), 'ca-chain.crt'),
    };
  }
}

export const certService = new CertService();
