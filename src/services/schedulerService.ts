import * as schedule from 'node-schedule';
import * as fs from 'fs';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { versionService } from './versionService';
import { autoUpdateService } from './autoUpdateService';

export interface SchedulerResult {
  success: boolean;
  message: string;
  error?: string;
}

export class SchedulerService {
  private logger = getLogger();
  private dailyCheckJob: schedule.Job | null = null;
  private isRunning: boolean = false;

  startDailyCertificateCheck(): void {
    const config = getConfig();
    const scheduleTime = config.scheduler?.dailyCheckTime || '09:00';

    this.logger.info(`Starting daily certificate check scheduler at ${scheduleTime}`);

    const [hour, minute] = scheduleTime.split(':').map(Number);

    this.dailyCheckJob = schedule.scheduleJob({ hour, minute }, async () => {
      await this.runDailyCheck();
    });

    this.logger.info('Daily certificate check scheduler started');
  }

  stopDailyCertificateCheck(): void {
    if (this.dailyCheckJob) {
      this.dailyCheckJob.cancel();
      this.dailyCheckJob = null;
      this.logger.info('Daily certificate check scheduler stopped');
    }
  }

  async runDailyCheck(): Promise<SchedulerResult> {
    if (this.isRunning) {
      this.logger.warn('Daily check already running, skipping');
      return {
        success: false,
        message: 'Daily check already in progress',
      };
    }

    this.isRunning = true;
    this.logger.info('Starting daily certificate check');

    try {
      const hasConnection = await autoUpdateService.isServerReachable();

      if (!hasConnection) {
        this.logger.warn('CA Server is not reachable during daily check');
        return {
          success: false,
          message: 'CA Server not reachable',
        };
      }

      this.logger.info('CA Server is reachable, checking for new certificates');

      const result = await autoUpdateService.triggerUpdate(
        getConfig().caServer?.password || 'default-password'
      );

      if (result.success && result.version) {
        this.logger.info(`Daily check completed: Certificate updated to version ${result.version}`);
        
        const decrypted = await this.getCurrentDecrypted();
        if (decrypted) {
          await versionService.backupVersion(decrypted.cert, decrypted.key, decrypted.ca);
        }

        return {
          success: true,
          message: `Certificate updated to version ${result.version}`,
        };
      } else if (result.retained) {
        this.logger.info('Daily check completed: Existing certificate retained');
        return {
          success: true,
          message: 'Existing certificate retained',
        };
      } else {
        this.logger.warn(`Daily check completed but no update: ${result.error}`);
        return {
          success: true,
          message: `No new certificate available: ${result.error}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Daily check failed: ${errorMessage}`);

      return {
        success: false,
        message: 'Daily check failed',
        error: errorMessage,
      };
    } finally {
      this.isRunning = false;
    }
  }

  private async getCurrentDecrypted(): Promise<{ cert: string; key?: string; ca?: string } | null> {
    try {
      const certService = await import('./certService').then(m => m.certService);
      const paths = certService.getCertificatePaths();

      let cert: string | undefined;
      let key: string | undefined;
      let ca: string | undefined;

      if (fs.existsSync(paths.clientCert)) {
        cert = fs.readFileSync(paths.clientCert, 'utf-8');
      }
      if (fs.existsSync(paths.clientKey)) {
        key = fs.readFileSync(paths.clientKey, 'utf-8');
      }
      if (fs.existsSync(paths.caChain)) {
        ca = fs.readFileSync(paths.caChain, 'utf-8');
      }

      if (cert) {
        return { cert, key, ca };
      }
      return null;
    } catch {
      return null;
    }
  }

  getStatus(): { isRunning: boolean; nextRun?: string } {
    return {
      isRunning: this.isRunning,
      nextRun: this.dailyCheckJob?.nextInvocation()?.toISOString(),
    };
  }
}

export const schedulerService = new SchedulerService();
