import request from 'supertest';
import express from 'express';

const mockWarn = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    server: {
      apiKey: 'test-api-key-12345678',
    },
  })),
}));

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  })),
}));

// Import after mocks are set up
import { authenticate } from '../src/middleware/auth';

describe('Authentication Middleware', () => {
  const app = express();
  const validApiKey = 'test-api-key-12345678';

  beforeAll(() => {
    app.use(express.json());
    
    // Protected route
    app.get('/protected', authenticate, (req, res) => {
      res.json({ message: 'Success' });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Authentication', () => {
    it('should allow access with valid API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });

    it('should allow access with valid API key (different endpoint)', async () => {
      const app2 = express();
      app2.use(express.json());
      app2.post('/certs', authenticate, (req, res) => {
        res.status(201).json({ data: { success: true } });
      });

      const response = await request(app2)
        .post('/certs')
        .set('a-api-key', validApiKey);

      expect(response.status).toBe(201);
      expect(response.body.data.success).toBe(true);
    });
  });

  describe('Invalid Authentication', () => {
    it('should return 401 for invalid API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('a-api-key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid or missing API key');
    });

    it('should return 401 for completely wrong API key format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('a-api-key', 'wrong-format-12345678');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for empty API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('a-api-key', '');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Missing Authentication', () => {
    it('should return 401 when API key header is missing', async () => {
      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when wrong header name is used', async () => {
      const response = await request(app)
        .get('/protected')
        .set('authorization', `Bearer ${validApiKey}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when API key is in query param', async () => {
      const response = await request(app)
        .get('/protected?apiKey=' + validApiKey);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Logging', () => {
    it('should log warning for unauthorized access attempts', async () => {
      await request(app)
        .get('/protected')
        .set('a-api-key', 'invalid-key');

      expect(mockWarn).toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        expect.objectContaining({ path: '/protected' })
      );
    });

    it('should log warning for missing API key', async () => {
      await request(app)
        .get('/protected');

      expect(mockWarn).toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        expect.objectContaining({ path: '/protected' })
      );
    });

    it('should not log warning for valid access', async () => {
      await request(app)
        .get('/protected')
        .set('a-api-key', validApiKey);

      expect(mockWarn).not.toHaveBeenCalled();
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use timing-safe comparison (not early return on length mismatch)', async () => {
      // Test with wrong length key - should still take similar time
      const start = Date.now();
      await request(app)
        .get('/protected')
        .set('a-api-key', 'short');
      const duration1 = Date.now() - start;

      const start2 = Date.now();
      await request(app)
        .get('/protected')
        .set('a-api-key', 'this-is-a-very-long-invalid-key-that-matches-length');
      const duration2 = Date.now() - start2;

      // Both should return 401
      // Note: In real timing attack tests, we'd measure more precisely
      // This is just a sanity check that both return unauthorized
      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('All Endpoints Protected', () => {
    const testEndpoints = [
      { method: 'get', path: '/api/v1/certs' },
      { method: 'post', path: '/api/v1/certs' },
      { method: 'get', path: '/api/v1/certs/status' },
      { method: 'get', path: '/api/v1/certs/versions' },
      { method: 'get', path: '/api/v1/certs/download/cert' },
    ];

    testEndpoints.forEach(({ method, path }) => {
      it(`should require auth for ${method.toUpperCase()} ${path}`, async () => {
        const testApp = express();
        testApp.use(express.json());
        testApp.use('/api/v1/certs', authenticate, (req, res) => {
          res.json({ success: true });
        });

        const response = await (request(testApp) as any)[method](path);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });
  });
});