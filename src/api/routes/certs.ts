import { Router } from 'express';
import type { Request, Response } from 'express';
import { certService } from '../../services/certService';
import { versionService } from '../../services/versionService';
import { auditService } from '../../services/auditService';
import { getConfig } from '../../config';
import { getLogger } from '../../utils/logger';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const router = Router();
const logger = getLogger();

interface CertificateMetadata {
  subject?: string;
  issuer?: string;
  notBefore?: string;
  notAfter?: string;
  valid?: boolean;
}

interface CertificateResponse {
  files: {
    cert: boolean;
    key: boolean;
    ca: boolean;
  };
  paths: {
    cert: string;
    key: string;
    ca: string;
  };
  metadata?: CertificateMetadata;
}

interface FetchResponse {
  success: boolean;
  version?: string;
  error?: string;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const paths = certService.getCertificatePaths();

    const certExists = existsSync(paths.clientCert);
    const keyExists = existsSync(paths.clientKey);
    const caExists = existsSync(paths.caChain);

    const response: CertificateResponse = {
      files: {
        cert: certExists,
        key: keyExists,
        ca: caExists,
      },
      paths: {
        cert: paths.clientCert,
        key: paths.clientKey,
        ca: paths.caChain,
      },
    };

    // Add metadata if certificate exists
    if (certExists) {
      response.metadata = parseCertificateMetadata(paths.clientCert);
    }

    logger.info('Certificate status requested');
    auditService.logApiAccess('GET /certs', true);
    res.json({ data: response });
  } catch (error) {
    logger.error('Failed to get certificates:', error);
    auditService.logApiAccess('GET /certs', false);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get certificates',
      },
    });
  }
});

router.post('/', async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const password = config.caServer?.password || 'default-password';

    logger.info('Certificate fetch requested');

    const result = await certService.fetchAndStoreCertificate(password);

    const response: FetchResponse = {
      success: result.success,
      version: result.version,
      error: result.error,
    };

    if (result.success) {
      logger.info(`Certificate fetched successfully: version ${result.version}`);
      auditService.logApiAccess('POST /certs', true, undefined, undefined, { version: result.version });
      res.status(201).json({ data: response });
    } else {
      logger.warn(`Certificate fetch failed: ${result.error}`);
      auditService.logApiAccess('POST /certs', false, undefined, undefined, { error: result.error });
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: result.error || 'Failed to fetch certificate',
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Certificate fetch error:', errorMessage);
    auditService.logApiAccess('POST /certs', false, undefined, undefined, { error: errorMessage });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch certificate: ${errorMessage}`,
      },
    });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const paths = certService.getCertificatePaths();
    const certPath = paths.clientCert;

    // Check if certificate exists
    if (!existsSync(certPath)) {
      logger.info('Status requested: No certificate found');
      res.json({
        data: {
          exists: false,
          message: 'No certificate found',
        },
      });
      return;
    }

    // Read and parse certificate
    const metadata = parseCertificateStatus(certPath);

    // Calculate days until expiry
    let daysUntilExpiry: number | undefined;
    if (metadata.validUntil) {
      const expiryDate = new Date(metadata.validUntil);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const statusResponse = {
      exists: true,
      version: metadata.version,
      subject: metadata.subject,
      issuer: metadata.issuer,
      validFrom: metadata.validFrom,
      validUntil: metadata.validUntil,
      daysUntilExpiry,
      isValid: metadata.isValid,
    };

    logger.info(`Status requested: Certificate valid until ${metadata.validUntil}`);
    res.json({ data: statusResponse });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Status check error:', errorMessage);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check certificate status',
      },
    });
  }
});

router.get('/versions', async (_req: Request, res: Response) => {
  try {
    const versions = await versionService.getVersions();

    logger.info(`Versions list requested: ${versions.versions.length} versions found`);

    res.json({
      data: versions.versions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        status: v.status,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Versions list error:', errorMessage);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve versions list',
      },
    });
  }
});

router.get('/audit', async (_req: Request, res: Response) => {
  try {
    const logs = auditService.getRecentLogs(100);
    
    logger.info(`Audit logs requested: ${logs.length} entries returned`);
    auditService.logApiAccess('GET /certs/audit', true);
    
    res.json({
      data: logs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Audit logs error:', errorMessage);
    auditService.logApiAccess('GET /certs/audit', false, undefined, undefined, { error: errorMessage });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit logs',
      },
    });
  }
});

router.get('/download/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    if (!['cert', 'key', 'ca'].includes(type)) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Type must be cert, key, or ca',
        },
      });
      return;
    }

    const paths = certService.getCertificatePaths();
    const filePath = type === 'cert'
      ? paths.clientCert
      : type === 'key'
        ? paths.clientKey
        : paths.caChain;

    if (!existsSync(filePath)) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `${type} file not found`,
        },
      });
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    const filename = type === 'ca' ? 'ca-chain.crt' : type === 'key' ? 'client.key' : 'client.crt';

    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

    logger.info(`Certificate file downloaded: ${type}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Certificate download error:', errorMessage);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to download certificate',
      },
    });
  }
});

interface StatusMetadata {
  version?: string;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validUntil?: string;
  isValid?: boolean;
}

function parseCertificateStatus(certPath: string): StatusMetadata {
  try {
    const content = readFileSync(certPath, 'utf-8');
    const now = new Date();

    const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/);
    const issuerMatch = content.match(/Issuer:\s*(.+?)(?:\n|$)/);
    const notBeforeMatch = content.match(/Not Before\s*:\s*(.+?)(?:\n|$)/);
    const notAfterMatch = content.match(/Not After\s*:\s*(.+?)(?:\n|$)/);

    let isValid = false;
    let validUntil: string | undefined;

    if (notAfterMatch) {
      validUntil = notAfterMatch[1].trim();
      const expiryDate = new Date(validUntil);
      isValid = now < expiryDate;
    }

    return {
      version: extractVersionFromCert(content),
      subject: subjectMatch ? subjectMatch[1].trim() : undefined,
      issuer: issuerMatch ? issuerMatch[1].trim() : undefined,
      validFrom: notBeforeMatch ? notBeforeMatch[1].trim() : undefined,
      validUntil,
      isValid,
    };
  } catch {
    return {};
  }
}

function extractVersionFromCert(content: string): string | undefined {
  // Try to extract version from certificate comments or metadata
  const versionMatch = content.match(/Version:\s*(.+?)(?:\n|$)/i);
  if (versionMatch) {
    return versionMatch[1].trim();
  }
  return undefined;
}

function parseCertificateMetadata(certPath: string): CertificateMetadata {
  try {
    const content = readFileSync(certPath, 'utf-8');
    const now = new Date();

    const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/);
    const issuerMatch = content.match(/Issuer:\s*(.+?)(?:\n|$)/);
    const notBeforeMatch = content.match(/Not Before\s*:\s*(.+?)(?:\n|$)/);
    const notAfterMatch = content.match(/Not After\s*:\s*(.+?)(?:\n|$)/);

    let valid = false;
    if (notAfterMatch) {
      const notAfter = new Date(notAfterMatch[1]);
      valid = now < notAfter;
    }

    return {
      subject: subjectMatch ? subjectMatch[1].trim() : undefined,
      issuer: issuerMatch ? issuerMatch[1].trim() : undefined,
      notBefore: notBeforeMatch ? notBeforeMatch[1].trim() : undefined,
      notAfter: notAfterMatch ? notAfterMatch[1].trim() : undefined,
      valid,
    };
  } catch {
    return {};
  }
}

export default router;