import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { caClient } from './caClient';
import { certService } from './certService';

export interface AutoUpdateResult {
  success: boolean;
  retained?: boolean;
  version?: string;
  error?: string;
}

export class AutoUpdateService {
  private logger = getLogger();

  async isServerReachable(): Promise<boolean> {
    try {
      const isReachable = await caClient.checkConnection();
      return isReachable;
    } catch {
      this.logger.error('Failed to check for updates: CA server unreachable');
      return false;
    }
  }

  async triggerUpdate(password?: string): Promise<AutoUpdateResult> {
    this.logger.info('Starting auto-update process');

    const caPassword = password || getConfig().caServer?.password || 'default-password';

    try {
      const hasConnection = await caClient.checkConnection();

      if (!hasConnection) {
        this.logger.warn('CA Server not reachable during auto-update, retaining existing certificate');
        return {
          success: false,
          retained: true,
          error: 'CA Server not reachable',
        };
      }

      this.logger.info('CA Server reachable, fetching new certificate');

      const result = await certService.fetchAndStoreCertificate(caPassword);

      if (result.success) {
        this.logger.info(`Auto-update successful: Certificate updated to version ${result.version}`);
        return {
          success: true,
          version: result.version,
        };
      } else {
        this.logger.warn(`Auto-update failed: ${result.error}, retaining existing certificate`);
        return {
          success: false,
          retained: true,
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Auto-update error: ${errorMessage}, retaining existing certificate`);

      return {
        success: false,
        retained: true,
        error: errorMessage,
      };
    }
  }
}

export const autoUpdateService = new AutoUpdateService();
