# cert-manager

A production-ready certificate management service built with Node.js, TypeScript, and Express.

## Features

- 🔐 **PFX Certificate Management**: Fetch, decrypt, and store PFX certificates
- 🔄 **Automatic Updates**: Daily certificate checks and auto-updates
- 📊 **REST API**: Full-featured API for certificate operations
- 🔒 **Security**: Bearer Token authentication, timing-safe comparison, file permission management
- 📋 **Audit Logging**: Complete audit trail of all certificate operations
- 🔄 **Automatic Rollback**: Self-healing with rollback after 3 consecutive failures
- 🚀 **PM2 Ready**: Production process management with PM2

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PM2 (for production deployment)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd cert-manager

# Install dependencies
npm install

# Build project
npm run build

# Create configuration
cp config.yaml.example config.yaml
# Edit config.yaml with your settings

# Start service
npm start
```

### Configuration

Edit `config.yaml`:

```yaml
server:
  host: "0.0.0.0"
  port: 3111
  apiKey: "your-secure-api-key-here"

caServer:
  url: "https://your-ca-server.com"
  authType: "api-key"
  apiKey: "your-ca-api-key"
  timeout: 30000
  password: "pfx-password"

scheduler:
  dailyCheckTime: "09:00"
  enabled: true

storage:
  basePath: "/var/lib/cert-manager"
  certsDir: "certs"
  metadataDir: "metadata"

logging:
  level: "info"
```

## API Documentation

### Authentication

All API endpoints (except `/api/v1/ping`) require authentication via API key header:

```
a-api-key: your-api-key-here
```

### Endpoints

#### Health Check
```
GET /api/v1/ping
```
Returns certificate health status (no authentication required).

**Response:**
```json
{
  "data": {
    "status": "OK",
    "version": "v-2026-03-16T10-00-00.000Z",
    "validUntil": "2025-12-31T23:59:59Z"
  }
}
```

Status values: `OK`, `NO_CERT`, `EXPIRED`

#### Get Certificate Status
```
GET /api/v1/certs
```
Returns current certificate files and metadata.

#### Fetch New Certificate
```
POST /api/v1/certs
```
Triggers certificate fetch from CA Server.

#### Get Certificate Status
```
GET /api/v1/certs/status
```
Returns detailed certificate information including expiry.

#### Get Version History
```
GET /api/v1/certs/versions
```
Returns list of all certificate versions.

#### Get Audit Logs
```
GET /api/v1/certs/audit
```
Returns recent audit log entries.

#### Download Certificate Files
```
GET /api/v1/certs/download/:type
```
Download certificate files (type: `cert`, `key`, `ca`).

## Directory Structure

```
cert-manager/
├── src/                    # Source code
│   ├── api/routes/        # API route handlers
│   ├── config/            # Configuration
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── storage/               # Certificate storage
│   ├── clientCerts/       # Client certificates
│   ├── CACerts/          # CA certificates
│   ├── metaData/         # Version history
│   └── audit/            # Audit logs
├── tests/                 # Test files
├── config.yaml           # Configuration file
├── pm2.config.js         # PM2 configuration
└── package.json
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/certService.test.ts
```

## Production Deployment

### PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start pm2.config.js

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

PM2 will automatically restart the service daily at 9 AM to load new certificates.

### Manual Deployment

```bash
# Build for production
npm run build

# Start server
node dist/index.js
```

### Storage Setup

Ensure the storage directory exists and has proper permissions:

```bash
sudo mkdir -p /var/lib/cert-manager
sudo chown -R $(whoami):$(whoami) /var/lib/cert-manager
sudo chmod 755 /var/lib/cert-manager
```

## Configuration Reference

### Server Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `host` | Server bind address | `0.0.0.0` |
| `port` | Server port | `3111` |
| `apiKey` | API authentication key | Required |

### CA Server Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `url` | CA Server URL | Required |
| `authType` | Authentication type (`api-key` or `certificate`) | `api-key` |
| `apiKey` | API key for CA Server | Required |
| `timeout` | Request timeout (ms) | `30000` |
| `password` | PFX decryption password | Required |

### Scheduler Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `dailyCheckTime` | Time for daily check (HH:MM) | `09:00` |
| `enabled` | Enable scheduler | `true` |

## Security

- **File Permissions**: Private keys are stored with 0600 permissions
- **Authentication**: All endpoints require Bearer Token authentication
- **Timing-Safe**: API key comparison uses timing-safe comparison
- **Audit Trail**: All operations are logged for compliance

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3111/api/v1/ping
```

### PM2 Monitoring

```bash
pm2 status
pm2 logs cert-manager
pm2 monit
```

## Troubleshooting

### Certificate Not Loading

1. Check CA Server connectivity:
   ```bash
   curl -I https://your-ca-server.com
   ```

2. Verify API key in `config.yaml`

3. Check logs:
   ```bash
   pm2 logs cert-manager
   ```

### Permission Errors

```bash
# Fix storage permissions
sudo chown -R $(whoami):$(whoami) /var/lib/cert-manager
sudo chmod -R 755 /var/lib/cert-manager
```

### Rollback Not Working

1. Ensure previous versions exist in `storage/metaData/`
2. Check version history via API: `GET /api/v1/certs/versions`
3. Review audit logs: `GET /api/v1/certs/audit`

## Documentation

For detailed documentation, see the `docs/` directory:

- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](docs/API.md) - Complete API reference
- [Configuration Reference](docs/CONFIGURATION.md) - Configuration options
- [Security Guide](docs/SECURITY.md) - Security best practices

## Project Structure

```
cert-manager/
├── src/                    # Source code
│   ├── api/routes/        # API route handlers
│   ├── config/            # Configuration
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── tests/                 # Test files
├── docs/                  # Documentation
├── storage/               # Certificate storage (created at runtime)
├── config.yaml           # Main configuration
├── config.yaml.example   # Configuration example
├── pm2.config.js         # PM2 configuration
├── Dockerfile            # Docker build file
├── docker-compose.yml    # Docker Compose setup
└── package.json
```

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.