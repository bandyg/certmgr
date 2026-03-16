import { CertService, CertificateStoreResult } from '../src/services/certService';

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    storage: {
      basePath: '/tmp/test-cert-manager',
      certsDir: 'certs',
      metadataDir: 'metadata',
    },
  })),
}));

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../src/services/caClient', () => ({
  caClient: {
    fetchPfx: jest.fn(),
  },
}));

jest.mock('../src/services/pfxService', () => ({
  pfxService: {
    decryptPfx: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  chmodSync: jest.fn(),
  copyFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import { caClient } from '../src/services/caClient';
import { pfxService } from '../src/services/pfxService';

describe('CertService', () => {
  let certService: CertService;

  beforeEach(() => {
    jest.clearAllMocks();
    certService = new CertService();
  });

  describe('fetchAndStoreCertificate', () => {
    it('should successfully fetch and store certificate', async () => {
      (caClient.fetchPfx as jest.Mock).mockResolvedValue({
        success: true,
        filePath: '/tmp/test.pfx',
      });

      (pfxService.decryptPfx as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
          key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
          ca: '-----BEGIN CERTIFICATE-----\nca\n-----END CERTIFICATE-----',
        },
      });

      const result: CertificateStoreResult = await certService.fetchAndStoreCertificate('password');

      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should handle fetch failure', async () => {
      (caClient.fetchPfx as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result: CertificateStoreResult = await certService.fetchAndStoreCertificate('password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle decrypt failure', async () => {
      (caClient.fetchPfx as jest.Mock).mockResolvedValue({
        success: true,
        filePath: '/tmp/test.pfx',
      });

      (pfxService.decryptPfx as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid password',
      });

      const result: CertificateStoreResult = await certService.fetchAndStoreCertificate('wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });
  });

  describe('storeCertificates', () => {
    it('should store certificates with correct permissions', async () => {
      const decrypted = {
        cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
        key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        ca: '-----BEGIN CERTIFICATE-----\nca\n-----END CERTIFICATE-----',
      };

      const result: CertificateStoreResult = await certService.storeCertificates(decrypted);

      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
    });

    it('should handle storage errors gracefully', async () => {
      const fs = require('fs');
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Write error');
      });

      const decrypted = {
        cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
        key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      };

      const result: CertificateStoreResult = await certService.storeCertificates(decrypted);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCertificatePaths', () => {
    it('should return correct paths', () => {
      const paths = certService.getCertificatePaths();

      expect(paths.clientCert).toContain('client.crt');
      expect(paths.clientKey).toContain('client.key');
      expect(paths.caChain).toContain('ca-chain.crt');
    });
  });
});
