import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

export interface PfxFetchResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export class CaClient {
  private logger = getLogger();

  private getTempDir(): string {
    const config = getConfig();
    const tempDir = join(config.storage.basePath, 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true, mode: 0o700 });
    }
    return tempDir;
  }

  async fetchPfx(): Promise<PfxFetchResult> {
    const config = getConfig();
    const caConfig = config.caServer;
    const tempDir = this.getTempDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pfxFileName = `${timestamp}.pfx`;
    const pfxFilePath = join(tempDir, pfxFileName);

    this.logger.info(`Fetching PFX from CA Server: ${caConfig.url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), caConfig.timeout);

      const headers: Record<string, string> = {
        'Accept': 'application/x-pkcs12',
      };

      if (caConfig.authType === 'api-key') {
        headers['X-API-Key'] = caConfig.apiKey;
      }

      const response = await fetch(`${caConfig.url}/api/v1/certs/pfx`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`CA Server returned error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `CA Server error: ${response.status} - ${errorText}`,
        };
      }

      const pfxBuffer = await response.arrayBuffer();
      const pfxContent = Buffer.from(pfxBuffer);

      writeFileSync(pfxFilePath, pfxContent, { mode: 0o600 });
      this.logger.info(`PFX saved to: ${pfxFilePath}`);

      return {
        success: true,
        filePath: pfxFilePath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch PFX from CA Server: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    const config = getConfig();
    const caConfig = config.caServer;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (caConfig.authType === 'api-key') {
        headers['X-API-Key'] = caConfig.apiKey;
      }

      const response = await fetch(`${caConfig.url}/api/v1/health`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const caClient = new CaClient();
