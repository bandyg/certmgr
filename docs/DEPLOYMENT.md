# Deployment Guide

This guide covers deploying cert-manager to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **Node.js**: v18.x or higher
- **Memory**: Minimum 512MB RAM, Recommended 1GB
- **Disk**: Minimum 1GB free space
- **Network**: Outbound HTTPS access to CA Server

### Required Software

```bash
# Install Node.js 18.x (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Node.js 18.x (CentOS/RHEL)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x

# Install PM2 globally
sudo npm install -g pm2
```

## Environment Setup

### 1. Create Service User

```bash
# Create dedicated user
sudo useradd -r -s /bin/false certmanager

# Create directories
sudo mkdir -p /var/lib/cert-manager
sudo mkdir -p /opt/cert-manager
sudo mkdir -p /var/log/cert-manager

# Set ownership
sudo chown -R certmanager:certmanager /var/lib/cert-manager
sudo chown -R certmanager:certmanager /opt/cert-manager
sudo chown -R certmanager:certmanager /var/log/cert-manager
```

### 2. Clone & Install

```bash
# Switch to service user
sudo su - certmanager

# Clone repository
cd /opt/cert-manager
git clone <your-repo-url> .

# Install dependencies
npm ci --production

# Build application
npm run build
```

### 3. Configure Storage Permissions

```bash
# Set proper permissions for storage
chmod 755 /var/lib/cert-manager
chmod 700 /var/lib/cert-manager/clientCerts
chmod 700 /var/lib/cert-manager/CACerts
chmod 700 /var/lib/cert-manager/metaData
chmod 700 /var/lib/cert-manager/audit
```

## Configuration

### 1. Create Production Config

```bash
cd /opt/cert-manager

cat > config.yaml << 'EOF'
server:
  host: "0.0.0.0"
  port: 3111
  apiKey: "${API_KEY}"

caServer:
  url: "${CA_SERVER_URL}"
  authType: "api-key"
  apiKey: "${CA_API_KEY}"
  timeout: 30000
  password: "${PFX_PASSWORD}"

scheduler:
  dailyCheckTime: "09:00"
  enabled: true

storage:
  basePath: "/var/lib/cert-manager"
  certsDir: "certs"
  metadataDir: "metadata"

logging:
  level: "info"
  pattern: "%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m"
  fileName: "cert-manager.log"
EOF
```

### 2. Environment Variables

Create `.env` file:

```bash
cat > /opt/cert-manager/.env << 'EOF'
# Server Configuration
API_KEY=your-secure-random-api-key-min-32-chars

# CA Server Configuration
CA_SERVER_URL=https://your-ca-server.example.com
CA_API_KEY=your-ca-server-api-key
PFX_PASSWORD=your-pfx-decryption-password

# Node Environment
NODE_ENV=production
EOF

# Secure the file
chmod 600 /opt/cert-manager/.env
```

### 3. PM2 Configuration

Update `pm2.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'cert-manager',
      script: 'dist/index.js',
      cwd: '/opt/cert-manager',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // Daily restart at 9 AM to reload certificates
      cron_restart: '0 9 * * *',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      // Logging
      log_file: '/var/log/cert-manager/combined.log',
      out_file: '/var/log/cert-manager/out.log',
      error_file: '/var/log/cert-manager/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

## Production Deployment

### 1. Start Service

```bash
# Start with PM2
pm2 start pm2.config.js

# Check status
pm2 status

# View logs
pm2 logs cert-manager

# Save PM2 config
pm2 save

# Setup startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u certmanager --hp /home/certmanager
```

### 2. Configure Firewall

```bash
# Allow port 3111 (Ubuntu/Debian with UFW)
sudo ufw allow 3111/tcp

# Allow port 3111 (CentOS/RHEL with firewalld)
sudo firewall-cmd --permanent --add-port=3111/tcp
sudo firewall-cmd --reload
```

### 3. Setup Reverse Proxy (Optional)

#### Nginx

```nginx
server {
    listen 443 ssl;
    server_name cert-manager.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY config.yaml ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S certmanager -u 1001

# Create storage directory
RUN mkdir -p /var/lib/cert-manager && chown -R certmanager:nodejs /var/lib/cert-manager

# Switch to non-root user
USER certmanager

# Expose port
EXPOSE 3111

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3111/api/v1/ping || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### 2. Build & Run

```bash
# Build Docker image
docker build -t cert-manager:latest .

# Run container
docker run -d \
  --name cert-manager \
  -p 3111:3111 \
  -v /var/lib/cert-manager:/var/lib/cert-manager \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  --restart unless-stopped \
  cert-manager:latest

# View logs
docker logs -f cert-manager
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  cert-manager:
    build: .
    container_name: cert-manager
    restart: unless-stopped
    ports:
      - "3111:3111"
    volumes:
      - /var/lib/cert-manager:/var/lib/cert-manager
      - ./config.yaml:/app/config.yaml:ro
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3111/api/v1/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Monitoring & Logging

### PM2 Monitoring

```bash
# View process status
pm2 status

# View logs
pm2 logs cert-manager
pm2 logs cert-manager --lines 100

# Monitor in real-time
pm2 monit

# Flush logs
pm2 flush
```

### Log Rotation

```bash
# Setup logrotate
sudo tee /etc/logrotate.d/cert-manager << 'EOF'
/var/log/cert-manager/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 certmanager certmanager
    sharedscripts
    postrotate
        pm2 reload cert-manager
    endscript
}
EOF
```

### Health Monitoring

```bash
# Check health endpoint
curl -s http://localhost:3111/api/v1/ping | jq

# Check with authentication
curl -s -H "a-api-key: your-api-key" http://localhost:3111/api/v1/certs/status | jq
```

## Backup & Recovery

### Automated Backups

```bash
# Create backup script
sudo tee /usr/local/bin/cert-manager-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/cert-manager"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup storage
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" /var/lib/cert-manager

# Backup config
cp /opt/cert-manager/config.yaml "$BACKUP_DIR/config_$DATE.yaml"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "config_*.yaml" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/cert-manager-backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/cert-manager-backup.sh >> /var/log/cert-manager/backup.log 2>&1" | sudo crontab -
```

### Recovery

```bash
# Stop service
pm2 stop cert-manager

# Restore from backup
sudo tar -xzf /backup/cert-manager/storage_20240316_020000.tar.gz -C /

# Start service
pm2 start cert-manager
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs cert-manager

# Verify config
cat /opt/cert-manager/config.yaml | head -20

# Check permissions
ls -la /var/lib/cert-manager/
ls -la /opt/cert-manager/
```

### Certificate Fetch Fails

```bash
# Test CA Server connectivity
curl -I https://your-ca-server.com

# Check API key
grep apiKey /opt/cert-manager/config.yaml

# Review audit logs
curl -H "a-api-key: your-key" http://localhost:3111/api/v1/certs/audit
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart cert-manager --max-memory-restart 1G
```

### Update Application

```bash
# Pull latest code
cd /opt/cert-manager
git pull origin main

# Install dependencies
npm ci --production

# Build
npm run build

# Restart
pm2 restart cert-manager

# Save PM2 config
pm2 save
```

---

**Next Steps:**
- See [API.md](API.md) for detailed API documentation
- See [CONFIGURATION.md](CONFIGURATION.md) for configuration reference
- See [SECURITY.md](SECURITY.md) for security best practices