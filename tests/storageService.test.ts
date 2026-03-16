import { storageService, StorageService } from '../src/services/storageService';
import type { CreateCertificateDTO, UpdateCertificateDTO, Certificate } from '../src/types/cert';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  chmodSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    storage: {
      basePath: '/tmp/test-certs',
      certsDir: 'certs',
      metadataDir: 'metadata',
    },
  })),
  loadConfig: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';

const mockFs = {
  existsSync: existsSync as jest.Mock,
  readFileSync: readFileSync as jest.Mock,
  writeFileSync: writeFileSync as jest.Mock,
  readdirSync: readdirSync as jest.Mock,
  unlinkSync: unlinkSync as jest.Mock,
};

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new certificate', async () => {
      const data: CreateCertificateDTO = {
        name: 'test-cert',
        type: 'client',
        cert: 'cert-content',
        key: 'key-content',
        ca: 'ca-content',
      };

      const result = await storageService.create(data);

      expect(result.id).toBe('test-uuid-1234');
      expect(result.name).toBe('test-cert');
      expect(result.type).toBe('client');
      expect(result.cert).toBe('cert-content');
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(4); // cert, key, ca, metadata
    });

    it('should create certificate without key and ca', async () => {
      const data: CreateCertificateDTO = {
        name: 'test-cert',
        type: 'ca',
        cert: 'cert-content',
      };

      const result = await storageService.create(data);

      expect(result.id).toBe('test-uuid-1234');
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // cert and metadata only
    });
  });

  describe('findById', () => {
    it('should find certificate by id', async () => {
      const mockCert: Certificate = {
        id: 'test-id',
        name: 'test-cert',
        type: 'client',
        cert: 'cert-content',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockCert));

      const result = await storageService.findById('test-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('test-cert');
    });

    it('should return null if certificate not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find certificate by name', async () => {
      const mockCert: Certificate = {
        id: 'test-id',
        name: 'test-cert',
        type: 'client',
        cert: 'cert-content',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockFs.readdirSync.mockReturnValue(['test-id.json']);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockCert));

      const result = await storageService.findByName('test-cert');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-cert');
    });

    it('should return null if certificate not found by name', async () => {
      const mockCert: Certificate = {
        id: 'test-id',
        name: 'other-cert',
        type: 'client',
        cert: 'cert-content',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockFs.readdirSync.mockReturnValue(['test-id.json']);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockCert));

      const result = await storageService.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all certificates', async () => {
      const mockCert1: Certificate = {
        id: 'id-1',
        name: 'cert-1',
        type: 'client',
        cert: 'cert-1-content',
        key: 'key-1-content',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      const mockCert2: Certificate = {
        id: 'id-2',
        name: 'cert-2',
        type: 'ca',
        cert: 'cert-2-content',
        metadata: {
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02',
        },
      };

      mockFs.readdirSync.mockReturnValue(['id-1.json', 'id-2.json']);
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(mockCert1))
        .mockReturnValueOnce(JSON.stringify(mockCert2));

      const result = await storageService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].hasKey).toBe(true);
      expect(result[1].hasKey).toBe(false);
    });

    it('should return empty array if no certificates', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      const result = await storageService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update existing certificate', async () => {
      const existingCert: Certificate = {
        id: 'test-id',
        name: 'old-name',
        type: 'client',
        cert: 'old-cert',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingCert));

      const updateData: UpdateCertificateDTO = {
        name: 'new-name',
        cert: 'new-cert',
      };

      const result = await storageService.update('test-id', updateData);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('new-name');
      expect(result?.cert).toBe('new-cert');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return null if certificate not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.update('nonexistent', { name: 'new-name' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete certificate and associated files', async () => {
      const existingCert: Certificate = {
        id: 'test-id',
        name: 'test-cert',
        type: 'client',
        cert: 'cert-content',
        key: 'key-content',
        ca: 'ca-content',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingCert));

      const result = await storageService.delete('test-id');

      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(4); // cert, key, ca, metadata
    });

    it('should return false if certificate not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getCertFile', () => {
    it('should return certificate file content', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('cert-file-content');

      const result = await storageService.getCertFile('test-id');

      expect(result).toBe('cert-file-content');
    });

    it('should return null if file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.getCertFile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getKeyFile', () => {
    it('should return key file content', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('key-file-content');

      const result = await storageService.getKeyFile('test-id');

      expect(result).toBe('key-file-content');
    });

    it('should return null if file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.getKeyFile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCaFile', () => {
    it('should return CA file content', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('ca-file-content');

      const result = await storageService.getCaFile('test-id');

      expect(result).toBe('ca-file-content');
    });

    it('should return null if file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await storageService.getCaFile('nonexistent');

      expect(result).toBeNull();
    });
  });
});