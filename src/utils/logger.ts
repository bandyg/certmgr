import log4js from 'log4js';
import { getConfig } from '../config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

let logger: log4js.Logger | null = null;

export function initLogger(): log4js.Logger {
  if (logger) return logger;

  const config = getConfig();
  
  const logDir = join(process.cwd(), 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  log4js.configure({
    appenders: {
      file: {
        type: 'file',
        filename: join(logDir, config.logging.fileName),
        maxLogSize: 10485760,
        backups: 5,
        compress: true,
      },
      console: {
        type: 'console',
      },
    },
    categories: {
      default: {
        appenders: ['console', 'file'],
        level: config.logging.level,
      },
    },
  });

  logger = log4js.getLogger('cert-manager');
  return logger;
}

export function getLogger(): log4js.Logger {
  if (!logger) {
    return initLogger();
  }
  return logger;
}

export function createCorrelationLogger(correlationId: string): log4js.Logger {
  const logger = getLogger();
  return log4js.getLogger(`cert-manager.${correlationId}`);
}
