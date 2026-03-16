import { Router } from 'express';
import type { Request, Response } from 'express';
import { certService } from '../../services/certService';
import { versionService } from '../../services/versionService';
import { rollbackService } from '../../services/rollbackService';
import { getLogger } from '../../utils/logger';
import { existsSync, readFileSync } from 'fs';

const router = Router();
const logger = getLogger();

interface PingResponse {
  status: 'OK' | 'NO_CERT' | 'EXPIRED';
  version?: string;
  validUntil?: string;
  expiredAt?: string;
  message?: string;
  rollbackTriggered?: boolean;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const paths = certService.getCertificatePaths();
    const certPath = paths.clientCert;

    // Check if certificate exists
    if (!existsSync(certPath)) {
      logger.info('Ping: No certificate found');
      
      // Record failure and check if rollback needed
      const shouldRollback = rollbackService.recordFailure();
      if (shouldRollback) {
        const rollbackResult = await rollbackService.rollback();
        const response: PingResponse = {
          status: 'NO_CERT',
          message: `No certificate loaded. ${rollbackResult.message}`,
          rollbackTriggered: true,
        };
        res.status(503).json({ data: response });
        return;
      }
      
      const response: PingResponse = {
        status: 'NO_CERT',
        message: 'No certificate loaded',
      };
      res.status(503).json({ data: response });
      return;
    }

    // Parse certificate to check validity
    const certInfo = parseCertificateInfo(certPath);

    if (!certInfo.validUntil) {
      logger.warn('Ping: Could not parse certificate expiry');
      // Reset failures since cert exists
      rollbackService.resetFailures();
      
      const response: PingResponse = {
        status: 'OK',
        version: certInfo.version,
        message: 'Certificate exists but expiry unknown',
      };
      res.json({ data: response });
      return;
    }

    const expiryDate = new Date(certInfo.validUntil);
    const now = new Date();

    // Check if expired
    if (now > expiryDate) {
      logger.warn(`Ping: Certificate expired on ${certInfo.validUntil}`);
      
      // Record failure and check if rollback needed
      const shouldRollback = rollbackService.recordFailure();
      if (shouldRollback) {
        const rollbackResult = await rollbackService.rollback();
        const response: PingResponse = {
          status: 'EXPIRED',
          version: certInfo.version,
          expiredAt: certInfo.validUntil,
          message: rollbackResult.message,
          rollbackTriggered: true,
        };
        res.status(503).json({ data: response });
        return;
      }
      
      const response: PingResponse = {
        status: 'EXPIRED',
        version: certInfo.version,
        expiredAt: certInfo.validUntil,
      };
      res.status(503).json({ data: response });
      return;
    }

    // Certificate is valid - reset failure counter
    rollbackService.resetFailures();
    
    logger.info('Ping: Certificate is valid');
    const response: PingResponse = {
      status: 'OK',
      version: certInfo.version,
      validUntil: certInfo.validUntil,
    };
    res.json({ data: response });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Ping error:', errorMessage);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check certificate status',
      },
    });
  }
});

interface CertInfo {
  version?: string;
  validUntil?: string;
}

function parseCertificateInfo(certPath: string): CertInfo {
  try {
    const content = readFileSync(certPath, 'utf-8');

    const versionMatch = content.match(/Version:\s*(.+?)(?:\n|$)/i);
    const notAfterMatch = content.match(/Not After\s*:\s*(.+?)(?:\n|$)/);

    return {
      version: versionMatch ? versionMatch[1].trim() : undefined,
      validUntil: notAfterMatch ? notAfterMatch[1].trim() : undefined,
    };
  } catch {
    return {};
  }
}

export default router;