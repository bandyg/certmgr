import express from 'express';
import { loadConfig, getConfig } from './config';
import { initLogger, getLogger } from './logger';
import certRoutes from './routes';

export function createApp() {
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', certRoutes);

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const logger = getLogger();
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
  });

  return app;
}

export function startServer() {
  loadConfig();
  initLogger();
  
  const logger = getLogger();
  const config = getConfig();
  
  logger.info('Starting Certificate Manager Service');
  
  const app = createApp();
  
  app.listen(config.server.port, config.server.host, () => {
    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
    logger.info(`API Key: ${config.server.apiKey.substring(0, 4)}...${config.server.apiKey.substring(config.server.apiKey.length - 4)}`);
  });
}

if (require.main === module) {
  startServer();
}
