import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getLogger } from './logger';
import { certificateStorage } from './storage';
import type { CreateCertificateDTO, UpdateCertificateDTO } from './types';
import { getConfig } from './config';

const router = Router();
const logger = getLogger();

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const apiKey = req.headers['a-api-key'];

  if (!apiKey || apiKey !== config.server.apiKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    return;
  }

  next();
}

function validateCreateCertificate(req: Request, res: Response, next: NextFunction): void {
  const { name, type, cert } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Bad Request', message: 'name is required' });
    return;
  }

  if (!type || !['client', 'server', 'ca'].includes(type)) {
    res.status(400).json({ error: 'Bad Request', message: 'type must be client, server, or ca' });
    return;
  }

  if (!cert || typeof cert !== 'string') {
    res.status(400).json({ error: 'Bad Request', message: 'cert is required' });
    return;
  }

  if (type !== 'ca' && !req.body.key) {
    res.status(400).json({ error: 'Bad Request', message: 'key is required for client and server certificates' });
    return;
  }

  next();
}

function validateUpdateCertificate(req: Request, res: Response, next: NextFunction): void {
  const { type } = req.body;

  if (type && !['client', 'server', 'ca'].includes(type)) {
    res.status(400).json({ error: 'Bad Request', message: 'type must be client, server, or ca' });
    return;
  }

  next();
}

router.use(authenticate);

router.post('/certs', validateCreateCertificate, async (req: Request, res: Response) => {
  try {
    const data: CreateCertificateDTO = req.body;
    const existing = await certificateStorage.findByName(data.name);

    if (existing) {
      res.status(409).json({ error: 'Conflict', message: `Certificate with name '${data.name}' already exists` });
      return;
    }

    const cert = await certificateStorage.create(data);
    logger.info(`Certificate created: ${cert.id}`);
    res.status(201).json(cert);
  } catch (error) {
    logger.error('Failed to create certificate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create certificate' });
  }
});

router.get('/certs', async (req: Request, res: Response) => {
  try {
    const certs = await certificateStorage.findAll();
    res.json(certs);
  } catch (error) {
    logger.error('Failed to list certificates:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list certificates' });
  }
});

router.get('/certs/:id', async (req: Request, res: Response) => {
  try {
    const cert = await certificateStorage.findById(req.params.id);

    if (!cert) {
      res.status(404).json({ error: 'Not Found', message: 'Certificate not found' });
      return;
    }

    const response = { ...cert };
    delete response.key;
    res.json(response);
  } catch (error) {
    logger.error('Failed to get certificate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get certificate' });
  }
});

router.put('/certs/:id', validateUpdateCertificate, async (req: Request, res: Response) => {
  try {
    const data: UpdateCertificateDTO = req.body;
    const cert = await certificateStorage.update(req.params.id, data);

    if (!cert) {
      res.status(404).json({ error: 'Not Found', message: 'Certificate not found' });
      return;
    }

    const response = { ...cert };
    delete response.key;
    res.json(response);
  } catch (error) {
    logger.error('Failed to update certificate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update certificate' });
  }
});

router.delete('/certs/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await certificateStorage.delete(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Not Found', message: 'Certificate not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete certificate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete certificate' });
  }
});

router.get('/certs/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { file } = req.query;

    if (!file || !['cert', 'key', 'ca'].includes(file as string)) {
      res.status(400).json({ error: 'Bad Request', message: 'file must be cert, key, or ca' });
      return;
    }

    const cert = await certificateStorage.findById(id);
    if (!cert) {
      res.status(404).json({ error: 'Not Found', message: 'Certificate not found' });
      return;
    }

    if (file === 'key' && !cert.key) {
      res.status(404).json({ error: 'Not Found', message: 'Key not found for this certificate' });
      return;
    }

    if (file === 'ca' && !cert.ca) {
      res.status(404).json({ error: 'Not Found', message: 'CA not found for this certificate' });
      return;
    }

    const content = file === 'cert'
      ? cert.cert
      : file === 'key'
        ? cert.key
        : cert.ca;

    const filename = `${cert.name}.${file === 'ca' ? 'ca' : file === 'key' ? 'key' : 'pem'}`;

    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    logger.error('Failed to download certificate:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to download certificate' });
  }
});

export default router;
