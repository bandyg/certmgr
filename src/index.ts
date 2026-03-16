import express from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadConfig, getConfig } from './config';
import { initLogger, getLogger } from './utils';
import apiRoutes from './api/routes';
import { errorHandler } from './middleware/error';

export function createApp() {
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', apiRoutes);

  app.use(errorHandler);

  return app;
}

export function startServer() {
  loadConfig();
  initLogger();
  
  const logger = getLogger();
  const config = getConfig();
  
  logger.info('Starting Certificate Manager Service');
  
  // Log certificate information on startup
  logCertificateInfo();
  
  const app = createApp();
  
  app.listen(config.server.port, config.server.host, () => {
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
    logger.info(`API Key: ${config.server.apiKey.substring(0, 4)}...${config.server.apiKey.substring(config.server.apiKey.length - 4)}`);
  });
}

function logCertificateInfo() {
  const logger = getLogger();
  const config = getConfig();
  
  const clientCertsDir = join(config.storage.basePath, 'clientCerts');
  const clientCertPath = join(clientCertsDir, 'client.crt');
  const clientKeyPath = join(clientCertsDir, 'client.key');
  const caChainPath = join(config.storage.basePath, 'CACerts', 'ca-chain.crt');
  
  // Check and log client certificate
  if (existsSync(clientCertPath)) {
    logger.info(`Client certificate found: ${clientCertPath}`);
    try {
      const certContent = readFileSync(clientCertPath, 'utf-8');
      const versionMatch = certContent.match(/Version: (\d+)/);
      const subjectMatch = certContent.match(/Subject: (.+)/);
      const issuerMatch = certContent.match(/Issuer: (.+)/);
      const dateMatch = certContent.match(/Not After : (.+)/);
      
      if (subjectMatch) {
        logger.info(`Certificate Subject: ${subjectMatch[1]}`);
      }
      if (issuerMatch) {
        logger.info(`Certificate Issuer: ${issuerMatch[1]}`);
      }
      if (dateMatch) {
        logger.info(`Certificate Valid Until: ${dateMatch[1]}`);
      }
    } catch {
      logger.warn('Could not read certificate details');
    }
  } else {
    logger.warn(`No client certificate found at ${clientCertPath}`);
  }
  
  // Check private key
  if (existsSync(clientKeyPath)) {
    logger.info('Private key loaded');
  } else {
    logger.warn('No private key found');
  }
  
  // Check CA chain
  if (existsSync(caChainPath)) {
    logger.info('CA chain loaded');
  } else {
    logger.warn('No CA chain found');
  }
}

if (require.main === module) {
  startServer();
}
