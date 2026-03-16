import { join } from 'path';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

export type AuditOperation = 'FETCH' | 'DECRYPT' | 'STORE' | 'ROLLBACK' | 'API_ACCESS';

export interface AuditLogEntry {
  timestamp: string;
  operation: AuditOperation;
  result: 'SUCCESS' | 'FAILURE';
  details: {
    version?: string;
    filename?: string;
    message?: string;
    userAgent?: string;
    ipAddress?: string;
    endpoint?: string;
    [key: string]: any;
  };
}

export class AuditService {
  private logger = getLogger();

  private getAuditDir(): string {
    const config = getConfig();
    const dir = join(config.storage.basePath, 'audit');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    return dir;
  }

  private getAuditFilePath(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.getAuditDir(), `audit-${date}.log`);
  }

  /**
   * Log an audit entry
   */
  log(
    operation: AuditOperation,
    result: 'SUCCESS' | 'FAILURE',
    details: AuditLogEntry['details'] = {}
  ): void {
    try {
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        operation,
        result,
        details,
      };

      const logLine = JSON.stringify(entry) + '\n';
      const auditFile = this.getAuditFilePath();

      appendFileSync(auditFile, logLine, { mode: 0o600 });

      this.logger.info(`Audit: ${operation} - ${result}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to write audit log:', errorMessage);
    }
  }

  /**
   * Log certificate fetch operation
   */
  logFetch(success: boolean, version?: string, error?: string): void {
    this.log('FETCH', success ? 'SUCCESS' : 'FAILURE', {
      version,
      message: error,
    });
  }

  /**
   * Log certificate store operation
   */
  logStore(success: boolean, version?: string, error?: string): void {
    this.log('STORE', success ? 'SUCCESS' : 'FAILURE', {
      version,
      message: error,
    });
  }

  /**
   * Log rollback operation
   */
  logRollback(success: boolean, fromVersion?: string, toVersion?: string, error?: string): void {
    this.log('ROLLBACK', success ? 'SUCCESS' : 'FAILURE', {
      fromVersion,
      toVersion,
      message: error,
    });
  }

  /**
   * Log API access
   */
  logApiAccess(
    endpoint: string,
    success: boolean,
    userAgent?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): void {
    this.log('API_ACCESS', success ? 'SUCCESS' : 'FAILURE', {
      endpoint,
      userAgent,
      ipAddress,
      ...details,
    });
  }

  /**
   * Get recent audit logs
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    try {
      const auditFile = this.getAuditFilePath();

      if (!existsSync(auditFile)) {
        return [];
      }

      const content = readFileSync(auditFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      // Parse JSON lines and return last 'limit' entries
      const entries: AuditLogEntry[] = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry): entry is AuditLogEntry => entry !== null);

      return entries;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to read audit logs:', errorMessage);
      return [];
    }
  }
}

export const auditService = new AuditService();