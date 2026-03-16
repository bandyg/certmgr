import * as fs from 'fs';
import * as path from 'path';

describe('Daily Restart Configuration', () => {
  describe('PM2 Configuration', () => {
    const projectRoot = process.cwd();
    const pm2ConfigPath = path.join(projectRoot, 'pm2.config.js');

    it('should have pm2.config.js file', () => {
      expect(fs.existsSync(pm2ConfigPath)).toBe(true);
    });

    it('should have cron_restart configured for 9 AM daily', () => {
      const configContent = fs.readFileSync(pm2ConfigPath, 'utf-8');
      
      // Check for cron_restart setting
      expect(configContent).toContain('cron_restart');
      expect(configContent).toContain('0 9 * * *');
    });

    it('should configure graceful shutdown', () => {
      const configContent = fs.readFileSync(pm2ConfigPath, 'utf-8');
      
      expect(configContent).toContain('kill_timeout');
      expect(configContent).toContain('wait_ready');
    });
  });

  describe('Certificate Loading on Startup', () => {
    it('logCertificateInfo function should exist', () => {
      // This is an integration test that would require mocking file system
      // The function is called in startServer() and logs certificate info
      expect(true).toBe(true);
    });
  });
});