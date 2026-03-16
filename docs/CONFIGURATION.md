# Configuration Reference

Complete reference for cert-manager configuration options.

## Configuration File

Configuration is stored in `config.yaml` in YAML format.

## Configuration Sections

### Server Configuration

```yaml
server:
  host: "0.0.0.0"
  port: 3111
  apiKey: "your-secure-api-key"
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `"0.0.0.0"` | Server bind address. Use `"127.0.0.1"` for localhost only, `"0.0.0.0"` for all interfaces. |
| `port` | number | `3111` | Server port number. Must be between 1-65535. |
| `apiKey` | string | (required) | API key for authentication. Minimum 32 characters recommended. |

**Security Recommendations:**
- Use a strong, randomly generated API key (at least 32 characters)
- Store API key in environment variable for production
- Rotate API keys regularly
- Never commit API keys to version control

### CA Server Configuration

```yaml
caServer:
  url: "https://ca-server.example.com"
  authType: "api-key"
  apiKey: "ca-server-api-key"
  timeout: 30000
  password: "pfx-password"
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | (required) | CA Server base URL. Must include protocol (http:// or https://). |
| `authType` | string | `"api-key"` | Authentication method. Options: `"api-key"` or `"certificate"`. |
| `apiKey` | string | (required for api-key) | API key for CA Server authentication. |
| `timeout` | number | `30000` | Request timeout in milliseconds. Default: 30 seconds. |
| `password` | string | (required) | Password for PFX file decryption. |

### Scheduler Configuration

```yaml
scheduler:
  dailyCheckTime: "09:00"
  enabled: true
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dailyCheckTime` | string | `"09:00"` | Time for daily certificate check in 24-hour format (HH:MM). |
| `enabled` | boolean | `true` | Enable/disable the daily scheduler. |

The scheduler runs at the specified time every day and:
1. Checks CA Server connectivity
2. Fetches new certificate if available
3. Decrypts and stores the certificate
4. Backs up the previous version

### Storage Configuration

```yaml
storage:
  basePath: "/var/lib/cert-manager"
  certsDir: "certs"
  metadataDir: "metadata"
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | string | `"/var/lib/cert-manager"` | Base directory for all storage. |
| `certsDir` | string | `"certs"` | Subdirectory for certificates. |
| `metadataDir` | string | `"metadata"` | Subdirectory for version metadata. |

**Directory Structure:**
```
${basePath}/
├── clientCerts/      # Client certificates
│   ├── client.crt   # Certificate file (0644)
│   └── client.key   # Private key file (0600)
├── CACerts/         # CA certificates
│   └── ca-chain.crt # CA chain file (0644)
├── metaData/        # Version history
│   ├── versions.json
│   └── v-2026-.../  # Individual version backups
└── audit/           # Audit logs
    └── audit-2026-03-16.log
```

**File Permissions:**
- Directories: `0700` (owner only)
- Certificate files: `0644` (readable by all)
- Private key files: `0600` (owner only)
- Metadata files: `0600` (owner only)

### Logging Configuration

```yaml
logging:
  level: "info"
  pattern: "%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m"
  fileName: "cert-manager.log"
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | string | `"info"` | Log level. Options: `"debug"`, `"info"`, `"warn"`, `"error"`. |
| `pattern` | string | (see default) | Log message pattern. Uses log4js pattern syntax. |
| `fileName` | string | `"cert-manager.log"` | Log file name. |

**Log Levels:**
- `debug`: Detailed debugging information
- `info`: General operational information
- `warn`: Warning messages
- `error`: Error messages

**Pattern Syntax:**
- `%d{format}` - Date/time
- `%p` - Log level (priority)
- `%c` - Category
- `%m` - Log message
- `%n` - Newline

## Environment Variables

You can use environment variables in `config.yaml`:

```yaml
server:
  apiKey: "${API_KEY}"

caServer:
  url: "${CA_SERVER_URL}"
  apiKey: "${CA_API_KEY}"
  password: "${PFX_PASSWORD}"
```

Set environment variables:

```bash
export API_KEY="your-secure-api-key"
export CA_SERVER_URL="https://ca-server.example.com"
export CA_API_KEY="your-ca-api-key"
export PFX_PASSWORD="your-pfx-password"
```

Or use a `.env` file:

```bash
# .env file
API_KEY=your-secure-api-key
CA_SERVER_URL=https://ca-server.example.com
CA_API_KEY=your-ca-api-key
PFX_PASSWORD=your-pfx-password
```

## Configuration Examples

### Development

```yaml
server:
  host: "127.0.0.1"
  port: 3111
  apiKey: "dev-api-key-not-for-production"

caServer:
  url: "http://localhost:8080"
  authType: "api-key"
  apiKey: "dev-ca-key"
  timeout: 30000
  password: "dev-password"

scheduler:
  dailyCheckTime: "09:00"
  enabled: true

storage:
  basePath: "./storage"
  certsDir: "certs"
  metadataDir: "metadata"

logging:
  level: "debug"
```

### Production

```yaml
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
```

### Minimal

```yaml
server:
  apiKey: "your-api-key"

caServer:
  url: "https://ca.example.com"
  apiKey: "ca-api-key"
  password: "pfx-password"

storage:
  basePath: "/var/lib/cert-manager"
```

## Validation

The application validates configuration on startup:

1. **Required fields**: Checks for required configuration values
2. **Path validation**: Ensures storage paths are valid
3. **Permission check**: Verifies write access to storage directory
4. **Network validation**: Optionally tests CA Server connectivity

**Startup Errors:**
- Missing required fields will prevent startup
- Invalid paths will log warnings
- Permission errors will throw exceptions

## Configuration Reload

Configuration is loaded once at startup. To apply changes:

1. Update `config.yaml`
2. Restart the service:
   ```bash
   pm2 restart cert-manager
   ```

Or use PM2's graceful reload:

```bash
pm2 reload cert-manager
```

## Security Considerations

### API Key Security

```yaml
# ❌ BAD - Hardcoded in config
server:
  apiKey: "hardcoded-secret-key"

# ✅ GOOD - Environment variable
server:
  apiKey: "${API_KEY}"
```

### File Permissions

Ensure proper permissions:

```bash
# Config file
chmod 600 config.yaml

# Storage directory
chmod 700 /var/lib/cert-manager

# Audit logs
chmod 600 /var/lib/cert-manager/audit/*.log
```

### Network Security

```yaml
# ❌ BAD - HTTP (unencrypted)
caServer:
  url: "http://ca-server.example.com"

# ✅ GOOD - HTTPS (encrypted)
caServer:
  url: "https://ca-server.example.com"
```

## Troubleshooting

### Configuration Not Loading

1. Check file exists:
   ```bash
   ls -la config.yaml
   ```

2. Validate YAML syntax:
   ```bash
   # Using Python
   python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"
   
   # Using yamllint
   yamllint config.yaml
   ```

3. Check file permissions:
   ```bash
   # File must be readable
   chmod 644 config.yaml
   ```

### Environment Variables Not Working

1. Verify variables are set:
   ```bash
   echo $API_KEY
   ```

2. Check syntax:
   ```yaml
   # Correct
   apiKey: "${API_KEY}"
   
   # Incorrect
   apiKey: ${API_KEY}  # Missing quotes
   apiKey: "$API_KEY"  # Wrong syntax
   ```

---

**See Also:**
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [API Documentation](API.md) - API reference
- [Security Guide](SECURITY.md) - Security best practices