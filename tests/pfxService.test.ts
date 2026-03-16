import { PfxService, PfxDecryptResult } from '../src/services/pfxService';

jest.mock('../src/utils/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import { readFileSync } from 'fs';

describe('PfxService', () => {
  let pfxService: PfxService;

  beforeEach(() => {
    jest.clearAllMocks();
    pfxService = new PfxService();
  });

  describe('decryptPfx', () => {
    it('should handle missing PFX file gracefully', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result: PfxDecryptResult = await pfxService.decryptPfx('/nonexistent.pfx', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid PFX format gracefully', async () => {
      (readFileSync as jest.Mock).mockReturnValue(Buffer.from('invalid-pfx-data'));

      const result: PfxDecryptResult = await pfxService.decryptPfx('/test.pfx', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
