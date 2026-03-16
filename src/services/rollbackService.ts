import { join } from 'path';
import { existsSync, copyFileSync } from 'fs';
import { versionService, VersionEntry } from './versionService';
import { certService } from './certService';
import { auditService } from './auditService';
import { getLogger } from '../utils/logger';

export interface RollbackResult {
  success: boolean;
  message: string;
  previousVersion?: string;
}

export class RollbackService {
  private logger = getLogger();
  private failureCount: number = 0;
  private readonly FAILURE_THRESHOLD = 3;

  /**
   * Record a ping failure and check if rollback should be triggered
   */
  recordFailure(): boolean {
    this.failureCount++;
    this.logger.warn(`Ping failure recorded. Count: ${this.failureCount}/${this.FAILURE_THRESHOLD}`);

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.logger.error(`Failure threshold reached (${this.FAILURE_THRESHOLD}). Triggering rollback...`);
      return true;
    }

    return false;
  }

  /**
   * Reset failure counter (called when ping succeeds)
   */
  resetFailures(): void {
    if (this.failureCount > 0) {
      this.logger.info(`Resetting failure counter (was ${this.failureCount})`);
      this.failureCount = 0;
    }
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Perform rollback to previous version
   */
  async rollback(): Promise<RollbackResult> {
    this.logger.info('Starting automatic rollback...');

    try {
      // Get all versions
      const versions = await versionService.getVersions();

      // Find current active version
      const currentVersion = versions.versions.find(v => v.status === 'active');
      
      if (!currentVersion) {
        this.logger.error('No active version found to rollback from');
        return {
          success: false,
          message: 'No active version found',
        };
      }

      // Find previous version (most recent archived version)
      const previousVersions = versions.versions
        .filter(v => v.status === 'archived')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (previousVersions.length === 0) {
        this.logger.error('No previous version available for rollback');
        return {
          success: false,
          message: 'No previous version available for rollback',
        };
      }

      const targetVersion = previousVersions[0];
      this.logger.info(`Rolling back from ${currentVersion.id} to ${targetVersion.id}`);

      // Perform the rollback
      const result = await versionService.rollbackToVersion(targetVersion.id);

      if (!result.success) {
        this.logger.error(`Rollback failed: ${result.error}`);
        return {
          success: false,
          message: `Rollback failed: ${result.error}`,
        };
      }

      // Copy files from backup to active location
      await this.restoreFiles(targetVersion);

      // Reset failure counter after successful rollback
      this.failureCount = 0;

      this.logger.info(`Successfully rolled back to version ${targetVersion.id}`);
      auditService.logRollback(true, currentVersion.id, targetVersion.id);

      return {
        success: true,
        message: `Rolled back to version ${targetVersion.id}`,
        previousVersion: targetVersion.id,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Rollback error: ${errorMessage}`);
      auditService.logRollback(false, undefined, undefined, errorMessage);
      return {
        success: false,
        message: `Rollback error: ${errorMessage}`,
      };
    }
  }

  /**
   * Restore certificate files from backup
   */
  private async restoreFiles(version: VersionEntry): Promise<void> {
    const paths = certService.getCertificatePaths();

    // Restore certificate
    if (version.certPath && existsSync(version.certPath)) {
      copyFileSync(version.certPath, paths.clientCert);
      this.logger.info(`Restored certificate from ${version.certPath}`);
    }

    // Restore key
    if (version.keyPath && existsSync(version.keyPath)) {
      copyFileSync(version.keyPath, paths.clientKey);
      this.logger.info(`Restored key from ${version.keyPath}`);
    }

    // Restore CA chain
    if (version.caPath && existsSync(version.caPath)) {
      copyFileSync(version.caPath, paths.caChain);
      this.logger.info(`Restored CA chain from ${version.caPath}`);
    }
  }
}

export const rollbackService = new RollbackService();