import { CaClient, PfxFetchResult } from '../src/services/caClient';

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    caServer: {
      url: 'https://ca-server.example.com',
      authType: 'api-key',
      apiKey: 'test-api-key',
      timeout: 30000,
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

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('CaClient', () => {
  let caClient: CaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    caClient = new CaClient();
  });

  describe('fetchPfx', () => {
    it('should successfully fetch PFX and save to temp storage', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result: PfxFetchResult = await caClient.fetchPfx();

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle CA Server errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result: PfxFetchResult = await caClient.fetchPfx();

      expect(result.success).toBe(false);
      expect(result.error).toContain('CA Server error');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result: PfxFetchResult = await caClient.fetchPfx();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('checkConnection', () => {
    it('should return true when CA Server is reachable', async () => {
      const mockResponse = {
        ok: true,
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await caClient.checkConnection();

      expect(result).toBe(true);
    });

    it('should return false when CA Server is unreachable', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await caClient.checkConnection();

      expect(result).toBe(false);
    });
  });
});
