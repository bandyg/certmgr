import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync, readdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import type { Certificate, CertificateListItem, CreateCertificateDTO, UpdateCertificateDTO } from '../types/cert';

export class StorageService {
  private certsDir: string;
  private metadataDir: string;
  private logger = getLogger();

  constructor() {
    const config = getConfig();
    this.certsDir = join(config.storage.basePath, config.storage.certsDir);
    this.metadataDir = join(config.storage.basePath, config.storage.metadataDir);
  }

  private getCertPath(id: string): string {
    return join(this.certsDir, `${id}.pem`);
  }

  private getKeyPath(id: string): string {
    return join(this.certsDir, `${id}.key`);
  }

  private getCaPath(id: string): string {
    return join(this.certsDir, `${id}.ca`);
  }

  private getMetadataPath(id: string): string {
    return join(this.metadataDir, `${id}.json`);
  }

  private setFilePermissions(path: string, mode: number): void {
    try {
      chmodSync(path, mode);
    } catch (error) {
      this.logger.error(`Failed to set permissions on ${path}:`, error);
    }
  }

  async create(data: CreateCertificateDTO): Promise<Certificate> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const cert: Certificate = {
      id,
      name: data.name,
      type: data.type,
      cert: data.cert,
      key: data.key,
      ca: data.ca,
      metadata: {
        createdAt: now,
        updatedAt: now,
        expiresAt: data.expiresAt,
        subject: data.subject,
        issuer: data.issuer,
      },
    };

    writeFileSync(this.getCertPath(id), cert.cert, { mode: 0o644 });
    this.logger.info(`Certificate file saved: ${this.getCertPath(id)}`);

    if (cert.key) {
      writeFileSync(this.getKeyPath(id), cert.key, { mode: 0o600 });
      this.logger.info(`Private key saved with restricted permissions: ${this.getKeyPath(id)}`);
    }

    if (cert.ca) {
      writeFileSync(this.getCaPath(id), cert.ca, { mode: 0o644 });
      this.logger.info(`CA file saved: ${this.getCaPath(id)}`);
    }

    writeFileSync(this.getMetadataPath(id), JSON.stringify(cert, null, 2), { mode: 0o600 });
    this.logger.info(`Certificate created: ${id} - ${data.name}`);

    return cert;
  }

  async findById(id: string): Promise<Certificate | null> {
    const metadataPath = this.getMetadataPath(id);

    if (!existsSync(metadataPath)) {
      return null;
    }

    const content = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content) as Certificate;
  }

  async findByName(name: string): Promise<Certificate | null> {
    const files = readdirSync(this.metadataDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = readFileSync(join(this.metadataDir, file), 'utf-8');
      const cert = JSON.parse(content) as Certificate;

      if (cert.name === name) {
        return cert;
      }
    }

    return null;
  }

  async findAll(): Promise<CertificateListItem[]> {
    const files = readdirSync(this.metadataDir);
    const certificates: CertificateListItem[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = readFileSync(join(this.metadataDir, file), 'utf-8');
      const cert = JSON.parse(content) as Certificate;

      certificates.push({
        id: cert.id,
        name: cert.name,
        type: cert.type,
        metadata: cert.metadata,
        hasKey: !!cert.key,
        hasCa: !!cert.ca,
      });
    }

    return certificates;
  }

  async update(id: string, data: UpdateCertificateDTO): Promise<Certificate | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: Certificate = {
      ...existing,
      name: data.name ?? existing.name,
      cert: data.cert ?? existing.cert,
      key: data.key ?? existing.key,
      ca: data.ca ?? existing.ca,
      metadata: {
        ...existing.metadata,
        updatedAt: now,
        expiresAt: data.expiresAt ?? existing.metadata.expiresAt,
        subject: data.subject ?? existing.metadata.subject,
        issuer: data.issuer ?? existing.metadata.issuer,
      },
    };

    if (data.cert) {
      writeFileSync(this.getCertPath(id), updated.cert, { mode: 0o644 });
    }

    if (data.key !== undefined) {
      if (data.key) {
        writeFileSync(this.getKeyPath(id), data.key, { mode: 0o600 });
      } else if (existsSync(this.getKeyPath(id))) {
        unlinkSync(this.getKeyPath(id));
      }
    }

    if (data.ca !== undefined) {
      if (data.ca) {
        writeFileSync(this.getCaPath(id), updated.ca!, { mode: 0o644 });
      } else if (existsSync(this.getCaPath(id))) {
        unlinkSync(this.getCaPath(id));
      }
    }

    writeFileSync(this.getMetadataPath(id), JSON.stringify(updated, null, 2), { mode: 0o600 });
    this.logger.info(`Certificate updated: ${id}`);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);

    if (!existing) {
      return false;
    }

    const filesToDelete = [
      this.getCertPath(id),
      this.getKeyPath(id),
      this.getCaPath(id),
      this.getMetadataPath(id),
    ];

    for (const file of filesToDelete) {
      if (existsSync(file)) {
        unlinkSync(file);
        this.logger.info(`Deleted file: ${file}`);
      }
    }

    this.logger.info(`Certificate deleted: ${id}`);
    return true;
  }

  async getCertFile(id: string): Promise<string | null> {
    const path = this.getCertPath(id);
    return existsSync(path) ? readFileSync(path, 'utf-8') : null;
  }

  async getKeyFile(id: string): Promise<string | null> {
    const path = this.getKeyPath(id);
    return existsSync(path) ? readFileSync(path, 'utf-8') : null;
  }

  async getCaFile(id: string): Promise<string | null> {
    const path = this.getCaPath(id);
    return existsSync(path) ? readFileSync(path, 'utf-8') : null;
  }
}

export const storageService = new StorageService();
