import { SchedulerService, SchedulerResult } from '../src/services/schedulerService';

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    caServer: {
      url: 'https://ca-server.example.com',
      authType: 'api-key',
      apiKey: 'test-api-key',
      timeout: 30000,
      password: 'test-password',
    },
    scheduler: {
      dailyCheckTime: '09:00',
      enabled: true,
    },
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
    checkConnection: jest.fn(),
  },
}));

jest.mock('../src/services/certService', () => ({
  certService: {
    fetchAndStoreCertificate: jest.fn(),
    getCertificatePaths: jest.fn(() => ({
      clientCert: '/tmp/test-cert-manager/certs/client.crt',
      clientKey: '/tmp/test-cert-manager/certs/client.key',
      caChain: '/tmp/test-cert-manager/certs/ca-chain.crt',
    })),
  },
}));

jest.mock('../src/services/versionService', () => ({
  versionService: {
    backupVersion: jest.fn(),
  },
}));

jest.mock('../src/services/autoUpdateService', () => ({
  autoUpdateService: {
    isServerReachable: jest.fn(),
    triggerUpdate: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
}));

import { caClient } from '../src/services/caClient';
import { certService } from '../src/services/certService';
import { versionService } from '../src/services/versionService';
import { autoUpdateService } from '../src/services/autoUpdateService';

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerService = new SchedulerService();
  });

  describe('runDailyCheck', () => {
    it('should check CA Server connectivity', async () => {
      (autoUpdateService.isServerReachable as jest.Mock).mockResolvedValue(true);
      (autoUpdateService.triggerUpdate as jest.Mock).mockResolvedValue({
        success: true,
        version: 'v-test',
      });
      (versionService.backupVersion as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result: SchedulerResult = await schedulerService.runDailyCheck();

      expect(autoUpdateService.isServerReachable).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle CA Server not reachable', async () => {
      (autoUpdateService.isServerReachable as jest.Mock).mockResolvedValue(false);

      const result: SchedulerResult = await schedulerService.runDailyCheck();

      expect(result.success).toBe(false);
      expect(result.message).toBe('CA Server not reachable');
    });

    it('should handle certificate fetch failure and retain existing', async () => {
      (autoUpdateService.isServerReachable as jest.Mock).mockResolvedValue(true);
      (autoUpdateService.triggerUpdate as jest.Mock).mockResolvedValue({
        success: false,
        retained: true,
        error: 'No new certificate',
      });

      const result: SchedulerResult = await schedulerService.runDailyCheck();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Existing certificate retained');
    });
  });

  describe('getStatus', () => {
    it('should return status', () => {
      const status = schedulerService.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('nextRun');
    });
  });
});
