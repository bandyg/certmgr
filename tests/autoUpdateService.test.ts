import { AutoUpdateService } from '../src/services/autoUpdateService';

jest.mock('../src/services/caClient', () => ({
  caClient: {
    checkConnection: jest.fn(),
    fetchPfx: jest.fn(),
  },
}));

jest.mock('../src/services/pfxService', () => ({
  pfxService: {
    decryptPfx: jest.fn(),
  },
}));

jest.mock('../src/services/certService', () => ({
  certService: {
    fetchAndStoreCertificate: jest.fn(),
    getCertificatePaths: jest.fn(),
  },
}));

jest.mock('../src/config', () => ({
  getConfig: jest.fn().mockReturnValue({
    storage: { basePath: '/tmp/test-certs' },
    caServer: { password: 'test-password' },
  }),
}));

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const { certService } = require('../src/services/certService');
const { caClient } = require('../src/services/caClient');

describe('AutoUpdateService', () => {
  let autoUpdateService: AutoUpdateService;

  beforeEach(() => {
    jest.clearAllMocks();
    autoUpdateService = new AutoUpdateService();
  });

  describe('triggerUpdate', () => {
    it('should successfully update certificate when new one is available', async () => {
      (caClient.checkConnection as jest.Mock).mockResolvedValue(true);
      (certService.fetchAndStoreCertificate as jest.Mock).mockResolvedValue({
        success: true,
        version: 'v-2026-03-15T10-00-00.000Z',
      });

      const result = await autoUpdateService.triggerUpdate();

      expect(result.success).toBe(true);
      expect(certService.fetchAndStoreCertificate).toHaveBeenCalledWith('test-password');
    });

    it('should handle failure and retain existing certificate', async () => {
      (caClient.checkConnection as jest.Mock).mockResolvedValue(true);
      (certService.fetchAndStoreCertificate as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await autoUpdateService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.retained).toBe(true);
      expect(result.error).toBe('Network error');
    });

    it('should log error when CA server is unreachable', async () => {
      (caClient.checkConnection as jest.Mock).mockResolvedValue(false);

      const result = await autoUpdateService.triggerUpdate();

      expect(result.success).toBe(false);
      expect(result.retained).toBe(true);
      expect(result.error).toContain('not reachable');
    });
  });

  describe('isServerReachable', () => {
    it('should return true when CA server is reachable', async () => {
      (caClient.checkConnection as jest.Mock).mockResolvedValue(true);

      const isReachable = await autoUpdateService.isServerReachable();

      expect(isReachable).toBe(true);
    });

    it('should return false when CA server is not reachable', async () => {
      (caClient.checkConnection as jest.Mock).mockResolvedValue(false);

      const isReachable = await autoUpdateService.isServerReachable();

      expect(isReachable).toBe(false);
    });
  });
});
