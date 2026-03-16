import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'fs';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

export interface VersionEntry {
  id: string;
  timestamp: string;
  status: 'active' | 'rolled-back' | 'archived';
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export interface VersionList {
  versions: VersionEntry[];
  currentVersion?: string;
}

export interface VersionResult {
  success: boolean;
  version?: VersionEntry;
  error?: string;
}

export class VersionService {
  private logger = getLogger();

  private getMetaDataDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'metaData');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private getVersionsFilePath(): string {
    return join(this.getMetaDataDir(), 'versions.json');
  }

  private getVersionDir(versionId: string): string {
    const dir = join(this.getMetaDataDir(), versionId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private readVersionsFile(): VersionList {
    const versionsFile = this.getVersionsFilePath();
    
    if (!existsSync(versionsFile)) {
      return { versions: [] };
    }

    try {
      const content = readFileSync(versionsFile, 'utf-8');
      return JSON.parse(content) as VersionList;
    } catch {
      return { versions: [] };
    }
  }

  private writeVersionsFile(versions: VersionList): void {
    const versionsFile = this.getVersionsFilePath();
    writeFileSync(versionsFile, JSON.stringify(versions, null, 2), { mode: 0o600 });
  }

  async backupVersion(
    certContent: string,
    keyContent?: string,
    caContent?: string
  ): Promise<VersionResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const versionId = `v-${timestamp}`;

      this.logger.info(`Creating version backup: ${versionId}`);

      const versionDir = this.getVersionDir(versionId);

      const certPath = join(versionDir, 'client.crt');
      writeFileSync(certPath, certContent, { mode: 0o644 });

      if (keyContent) {
        const keyPath = join(versionDir, 'client.key');
        writeFileSync(keyPath, keyContent, { mode: 0o600 });
      }

      if (caContent) {
        const caPath = join(versionDir, 'ca-chain.crt');
        writeFileSync(caPath, caContent, { mode: 0o644 });
      }

      const versionEntry: VersionEntry = {
        id: versionId,
        timestamp: new Date().toISOString(),
        status: 'active',
        certPath,
        keyPath: keyContent ? join(versionDir, 'client.key') : undefined,
        caPath: caContent ? join(versionDir, 'ca-chain.crt') : undefined,
      };

      const versions = this.readVersionsFile();

      for (const v of versions.versions) {
        if (v.status === 'active') {
          v.status = 'archived';
        }
      }

      versions.versions.push(versionEntry);
      versions.currentVersion = versionId;

      this.writeVersionsFile(versions);

      this.logger.info(`Version backup created: ${versionId}`);

      return {
        success: true,
        version: versionEntry,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create version backup: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getVersions(): Promise<VersionList> {
    return this.readVersionsFile();
  }

  async getVersion(versionId: string): Promise<VersionEntry | null> {
    const versions = this.readVersionsFile();
    return versions.versions.find(v => v.id === versionId) || null;
  }

  async rollbackToVersion(versionId: string): Promise<VersionResult> {
    try {
      const versions = this.readVersionsFile();
      const targetVersion = versions.versions.find(v => v.id === versionId);

      if (!targetVersion) {
        return {
          success: false,
          error: 'Version not found',
        };
      }

      for (const v of versions.versions) {
        if (v.status === 'active') {
          v.status = 'rolled-back';
        }
      }

      targetVersion.status = 'active';
      versions.currentVersion = versionId;

      this.writeVersionsFile(versions);

      this.logger.info(`Rolled back to version: ${versionId}`);

      return {
        success: true,
        version: targetVersion,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to rollback to version: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const versionService = new VersionService();
