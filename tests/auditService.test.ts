import { AuditService } from '../src/services/auditService';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    storage: {
      basePath: '/tmp/test-certs',
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
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockFs = {
  existsSync: existsSync as jest.Mock,
  mkdirSync: mkdirSync as jest.Mock,
  appendFileSync: appendFileSync as jest.Mock,
  readFileSync: readFileSync as jest.Mock,
};

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    auditService = new AuditService();
  });

  describe('log', () => {
    it('should write audit log entry', () => {
      auditService.log('FETCH', 'SUCCESS', { version: 'v-2026-03-16' });

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('FETCH');
      expect(logEntry.result).toBe('SUCCESS');
      expect(logEntry.details.version).toBe('v-2026-03-16');
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should create audit directory if not exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      auditService.log('STORE', 'SUCCESS');

      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('logFetch', () => {
    it('should log successful fetch', () => {
      auditService.logFetch(true, 'v-2026-03-16');

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('FETCH');
      expect(logEntry.result).toBe('SUCCESS');
      expect(logEntry.details.version).toBe('v-2026-03-16');
    });

    it('should log failed fetch', () => {
      auditService.logFetch(false, undefined, 'Network error');

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('FETCH');
      expect(logEntry.result).toBe('FAILURE');
      expect(logEntry.details.message).toBe('Network error');
    });
  });

  describe('logStore', () => {
    it('should log successful store', () => {
      auditService.logStore(true, 'v-2026-03-16');

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('STORE');
      expect(logEntry.result).toBe('SUCCESS');
    });
  });

  describe('logRollback', () => {
    it('should log successful rollback', () => {
      auditService.logRollback(true, 'v-2', 'v-1');

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('ROLLBACK');
      expect(logEntry.result).toBe('SUCCESS');
      expect(logEntry.details.fromVersion).toBe('v-2');
      expect(logEntry.details.toVersion).toBe('v-1');
    });
  });

  describe('logApiAccess', () => {
    it('should log API access', () => {
      auditService.logApiAccess('GET /certs', true, 'Mozilla/5.0', '127.0.0.1');

      const logCall = mockFs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1]);
      
      expect(logEntry.operation).toBe('API_ACCESS');
      expect(logEntry.result).toBe('SUCCESS');
      expect(logEntry.details.endpoint).toBe('GET /certs');
      expect(logEntry.details.userAgent).toBe('Mozilla/5.0');
      expect(logEntry.details.ipAddress).toBe('127.0.0.1');
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent logs', () => {
      const mockLogs = [
        JSON.stringify({ timestamp: '2026-03-16T10:00:00Z', operation: 'FETCH', result: 'SUCCESS', details: {} }),
        JSON.stringify({ timestamp: '2026-03-16T10:01:00Z', operation: 'STORE', result: 'SUCCESS', details: {} }),
      ].join('\n');

      mockFs.readFileSync.mockReturnValue(mockLogs);

      const logs = auditService.getRecentLogs(10);

      expect(logs).toHaveLength(2);
      expect(logs[0].operation).toBe('FETCH');
      expect(logs[1].operation).toBe('STORE');
    });

    it('should return empty array when no logs exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const logs = auditService.getRecentLogs(10);

      expect(logs).toEqual([]);
    });

    it('should limit number of returned logs', () => {
      const mockLogs = Array(150).fill(null).map((_, i) => 
        JSON.stringify({ timestamp: `2026-03-16T10:${i}:00Z`, operation: 'FETCH', result: 'SUCCESS', details: {} })
      ).join('\n');

      mockFs.readFileSync.mockReturnValue(mockLogs);

      const logs = auditService.getRecentLogs(50);

      expect(logs).toHaveLength(50);
    });
  });
});