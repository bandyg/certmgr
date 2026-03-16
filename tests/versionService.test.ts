import { VersionService, VersionList, VersionResult } from '../src/services/versionService';

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

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  copyFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
}));

describe('VersionService', () => {
  let versionService: VersionService;

  beforeEach(() => {
    jest.clearAllMocks();
    versionService = new VersionService();
  });

  describe('backupVersion', () => {
    it('should create a new version backup', async () => {
      const certContent = '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----';
      const keyContent = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      const result: VersionResult = await versionService.backupVersion(certContent, keyContent);

      expect(result.success).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.version?.id).toContain('v-');
      expect(result.version?.status).toBe('active');
    });

    it('should handle errors gracefully', async () => {
      const fs = require('fs');
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Write error');
      });

      const result: VersionResult = await versionService.backupVersion('cert', 'key');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getVersions', () => {
    it('should return empty list when no versions exist', async () => {
      const versions: VersionList = await versionService.getVersions();

      expect(versions.versions).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should return null for non-existent version', async () => {
      const version = await versionService.getVersion('v-nonexistent');

      expect(version).toBeNull();
    });
  });

  describe('rollbackToVersion', () => {
    it('should return error for non-existent version', async () => {
      const result: VersionResult = await versionService.rollbackToVersion('v-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Version not found');
    });
  });
});
