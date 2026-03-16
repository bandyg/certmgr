import request from 'supertest';
import express from 'express';
import apiRoutes from '../src/api/routes';
import { authenticate } from '../src/middleware/auth';

jest.mock('../src/services/certService', () => ({
  certService: {
    fetchAndStoreCertificate: jest.fn(),
    getCertificatePaths: jest.fn(() => ({
      clientCert: '/tmp/test-certs/clientCerts/client.crt',
      clientKey: '/tmp/test-certs/clientCerts/client.key',
      caChain: '/tmp/test-certs/CACerts/ca-chain.crt',
    })),
  },
}));

jest.mock('../src/services/versionService', () => ({
  versionService: {
    getVersions: jest.fn(),
  },
}));

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    server: {
      host: '0.0.0.0',
      port: 3111,
      apiKey: 'test-api-key-12345678',
    },
    caServer: {
      url: 'https://ca-server.example.com',
      password: 'test-password',
    },
    storage: {
      basePath: '/tmp/test-certs',
    },
  })),
  loadConfig: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  initLogger: jest.fn(),
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn((path: string) => {
    if (path.includes('client.crt')) return true;
    if (path.includes('client.key')) return true;
    if (path.includes('ca-chain.crt')) return true;
    return false;
  }),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('client.crt')) {
      return `-----BEGIN CERTIFICATE-----
Subject: CN=test-client
Issuer: CN=test-ca
Not Before : Jan 1 00:00:00 2024 GMT
Not After : Dec31 23:59:59 2025 GMT
-----END CERTIFICATE-----`;
    }
    return'';
  }),
}));

const { certService } = require('../src/services/certService');
const { versionService } = require('../src/services/versionService');

describe('Certificate API Endpoints', () => {
  const app = express();
  const validApiKey = 'test-api-key-12345678';

  beforeAll(() => {
    app.use(express.json());
    app.use('/api/v1', apiRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for missing API key', async () => {
      const response = await request(app).get('/api/v1/certs');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for invalid API key', async () => {
      const response = await request(app)
        .get('/api/v1/certs')
        .set('a-api-key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow access with valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /certs', () => {
    it('should return certificate status', async () => {
      const response = await request(app)
        .get('/api/v1/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('paths');
      expect(response.body.data.files.cert).toBe(true);
      expect(response.body.data.files.key).toBe(true);
      expect(response.body.data.files.ca).toBe(true);
    });

    it('should include certificate metadata', async () => {
      const response = await request(app)
        .get('/api/v1/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data.metadata).toHaveProperty('subject');
      expect(response.body.data.metadata).toHaveProperty('issuer');
    });
  });

  describe('POST /certs', () => {
    it('should fetch new certificate successfully', async () => {
      (certService.fetchAndStoreCertificate as jest.Mock).mockResolvedValue({
        success: true,
        version: 'v-2026-03-16T10-00-00.000Z',
      });

      const response = await request(app)
        .post('/api/v1/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.version).toBeDefined();
    });

    it('should return error when fetch fails', async () => {
      (certService.fetchAndStoreCertificate as jest.Mock).mockResolvedValue({
        success: false,
        error: 'CA Server unreachable',
      });

      const response = await request(app)
        .post('/api/v1/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('FETCH_FAILED');
    });
  });

  describe('GET /certs/download/:type', () => {
    it('should download certificate file', async () => {
      const response = await request(app)
        .get('/api/v1/certs/download/cert')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('application/x-pem-file');
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .get('/api/v1/certs/download/invalid')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /certs/status', () => {
    it('should return certificate status with all fields', async () => {
      const response = await request(app)
        .get('/api/v1/certs/status')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('exists', true);
      expect(response.body.data).toHaveProperty('subject');
      expect(response.body.data).toHaveProperty('issuer');
      expect(response.body.data).toHaveProperty('validFrom');
      expect(response.body.data).toHaveProperty('validUntil');
      expect(response.body.data).toHaveProperty('daysUntilExpiry');
      expect(response.body.data).toHaveProperty('isValid');
    });

    it('should return empty state when no certificate exists', async () => {
      const { existsSync } = require('fs');
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('client.crt')) return false;
        return true;
      });

      const response = await request(app)
        .get('/api/v1/certs/status')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('exists', false);
      expect(response.body.data).toHaveProperty('message', 'No certificate found');
    });
  });

  describe('GET /certs/versions', () => {
    it('should return list of versions', async () => {
      (versionService.getVersions as jest.Mock).mockResolvedValue({
        versions: [
          { id: 'v-2026-03-16T10-00-00.000Z', timestamp: '2026-03-16T10:00:00.000Z', status: 'active' },
          { id: 'v-2026-03-15T10-00-00.000Z', timestamp: '2026-03-15T10:00:00.000Z', status: 'archived' },
        ],
      });

      const response = await request(app)
        .get('/api/v1/certs/versions')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('timestamp');
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('should return empty array when no versions exist', async () => {
      (versionService.getVersions as jest.Mock).mockResolvedValue({
        versions: [],
      });

      const response = await request(app)
        .get('/api/v1/certs/versions')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
    });
  });
});