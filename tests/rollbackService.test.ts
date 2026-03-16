import { RollbackService } from '../src/services/rollbackService';
import { versionService } from '../src/services/versionService';
import { certService } from '../src/services/certService';
import { existsSync, copyFileSync } from 'fs';

jest.mock('../src/services/versionService', () => ({
  versionService: {
    getVersions: jest.fn(),
    rollbackToVersion: jest.fn(),
  },
}));

jest.mock('../src/services/certService', () => ({
  certService: {
    getCertificatePaths: jest.fn(() => ({
      clientCert: '/tmp/test-certs/clientCerts/client.crt',
      clientKey: '/tmp/test-certs/clientCerts/client.key',
      caChain: '/tmp/test-certs/CACerts/ca-chain.crt',
    })),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  copyFileSync: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockVersionService = versionService as jest.Mocked<typeof versionService>;
const mockCertService = certService as jest.Mocked<typeof certService>;
const mockFs = {
  existsSync: existsSync as jest.Mock,
  copyFileSync: copyFileSync as jest.Mock,
};

describe('RollbackService', () => {
  let rollbackService: RollbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    rollbackService = new RollbackService();
  });

  describe('Failure Tracking', () => {
    it('should increment failure count on recordFailure', () => {
      expect(rollbackService.getFailureCount()).toBe(0);
      
      rollbackService.recordFailure();
      expect(rollbackService.getFailureCount()).toBe(1);
      
      rollbackService.recordFailure();
      expect(rollbackService.getFailureCount()).toBe(2);
    });

    it('should return false when failure count is below threshold', () => {
      const result1 = rollbackService.recordFailure();
      expect(result1).toBe(false);
      
      const result2 = rollbackService.recordFailure();
      expect(result2).toBe(false);
    });

    it('should return true when failure count reaches threshold (3)', () => {
      rollbackService.recordFailure();
      rollbackService.recordFailure();
      
      const result = rollbackService.recordFailure();
      expect(result).toBe(true);
    });

    it('should reset failure count', () => {
      rollbackService.recordFailure();
      rollbackService.recordFailure();
      expect(rollbackService.getFailureCount()).toBe(2);
      
      rollbackService.resetFailures();
      expect(rollbackService.getFailureCount()).toBe(0);
    });
  });

  describe('Rollback', () => {
    it('should rollback to previous version when available', async () => {
      // Setup mock versions
      mockVersionService.getVersions.mockResolvedValue({
        versions: [
          {
            id: 'v-2026-03-16T10-00-00.000Z',
            timestamp: '2026-03-16T10:00:00.000Z',
            status: 'active',
            certPath: '/backup/v2/client.crt',
            keyPath: '/backup/v2/client.key',
            caPath: '/backup/v2/ca-chain.crt',
          },
          {
            id: 'v-2026-03-15T10-00-00.000Z',
            timestamp: '2026-03-15T10:00:00.000Z',
            status: 'archived',
            certPath: '/backup/v1/client.crt',
            keyPath: '/backup/v1/client.key',
            caPath: '/backup/v1/ca-chain.crt',
          },
        ],
      });

      mockVersionService.rollbackToVersion.mockResolvedValue({
        success: true,
        version: {
          id: 'v-2026-03-15T10-00-00.000Z',
          timestamp: '2026-03-15T10:00:00.000Z',
          status: 'active',
        },
      });

      mockFs.existsSync.mockReturnValue(true);

      const result = await rollbackService.rollback();

      expect(result.success).toBe(true);
      expect(result.previousVersion).toBe('v-2026-03-15T10-00-00.000Z');
      expect(mockVersionService.rollbackToVersion).toHaveBeenCalledWith('v-2026-03-15T10-00-00.000Z');
    });

    it('should fail rollback when no previous version exists', async () => {
      mockVersionService.getVersions.mockResolvedValue({
        versions: [
          {
            id: 'v-2026-03-16T10-00-00.000Z',
            timestamp: '2026-03-16T10:00:00.000Z',
            status: 'active',
          },
        ],
      });

      const result = await rollbackService.rollback();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No previous version available');
    });

    it('should fail rollback when no active version found', async () => {
      mockVersionService.getVersions.mockResolvedValue({
        versions: [],
      });

      const result = await rollbackService.rollback();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active version found');
    });

    it('should copy files during rollback', async () => {
      mockVersionService.getVersions.mockResolvedValue({
        versions: [
          {
            id: 'v-2026-03-16T10-00-00.000Z',
            timestamp: '2026-03-16T10:00:00.000Z',
            status: 'active',
            certPath: '/backup/v2/client.crt',
          },
          {
            id: 'v-2026-03-15T10-00-00.000Z',
            timestamp: '2026-03-15T10:00:00.000Z',
            status: 'archived',
            certPath: '/backup/v1/client.crt',
            keyPath: '/backup/v1/client.key',
            caPath: '/backup/v1/ca-chain.crt',
          },
        ],
      });

      mockVersionService.rollbackToVersion.mockResolvedValue({
        success: true,
        version: {
          id: 'v-2026-03-15T10-00-00.000Z',
          timestamp: '2026-03-15T10:00:00.000Z',
          status: 'active',
        },
      });

      mockFs.existsSync.mockReturnValue(true);

      await rollbackService.rollback();

      expect(mockFs.copyFileSync).toHaveBeenCalledTimes(3);
    });

    it('should reset failure counter after successful rollback', async () => {
      // Setup failures
      rollbackService.recordFailure();
      rollbackService.recordFailure();
      rollbackService.recordFailure();
      expect(rollbackService.getFailureCount()).toBe(3);

      mockVersionService.getVersions.mockResolvedValue({
        versions: [
          {
            id: 'v-2026-03-16T10-00-00.000Z',
            timestamp: '2026-03-16T10:00:00.000Z',
            status: 'active',
          },
          {
            id: 'v-2026-03-15T10-00-00.000Z',
            timestamp: '2026-03-15T10:00:00.000Z',
            status: 'archived',
          },
        ],
      });

      mockVersionService.rollbackToVersion.mockResolvedValue({
        success: true,
        version: {
          id: 'v-2026-03-15T10-00-00.000Z',
          timestamp: '2026-03-15T10:00:00.000Z',
          status: 'active',
        },
      });

      mockFs.existsSync.mockReturnValue(true);

      await rollbackService.rollback();

      expect(rollbackService.getFailureCount()).toBe(0);
    });
  });

  describe('End-to-end Flow', () => {
    it('should complete full failure-to-rollback flow', async () => {
      // Fail 3 times
      expect(rollbackService.recordFailure()).toBe(false);
      expect(rollbackService.recordFailure()).toBe(false);
      expect(rollbackService.recordFailure()).toBe(true);

      mockVersionService.getVersions.mockResolvedValue({
        versions: [
          {
            id: 'v-2026-03-16T10-00-00.000Z',
            timestamp: '2026-03-16T10:00:00.000Z',
            status: 'active',
          },
          {
            id: 'v-2026-03-15T10-00-00.000Z',
            timestamp: '2026-03-15T10:00:00.000Z',
            status: 'archived',
          },
        ],
      });

      mockVersionService.rollbackToVersion.mockResolvedValue({
        success: true,
        version: {
          id: 'v-2026-03-15T10-00-00.000Z',
          timestamp: '2026-03-15T10:00:00.000Z',
          status: 'active',
        },
      });

      mockFs.existsSync.mockReturnValue(true);

      const result = await rollbackService.rollback();

      expect(result.success).toBe(true);
      expect(rollbackService.getFailureCount()).toBe(0);
    });
  });
});