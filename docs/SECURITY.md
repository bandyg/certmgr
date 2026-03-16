# Security Guide

Security best practices and recommendations for cert-manager.

## Table of Contents

1. [Authentication](#authentication)
2. [API Key Management](#api-key-management)
3. [File Permissions](#file-permissions)
4. [Network Security](#network-security)
5. [Certificate Storage](#certificate-storage)
6. [Audit Logging](#audit-logging)
7. [Backup Security](#backup-security)
8. [Incident Response](#incident-response)

## Authentication

### Bearer Token Authentication

All API endpoints (except `/ping`) require Bearer Token authentication via the `a-api-key` header.

```http
GET /api/v1/certs HTTP/1.1
Host: localhost:3111
a-api-key: your-api-key-here
```

### Timing-Safe Comparison

The application uses `crypto.timingSafeEqual()` to prevent timing attacks during API key validation.

**Implementation:**
```typescript
// src/middleware/auth.ts
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    return false;
  }
  
  return timingSafeEqual(bufA, bufB);
}
```

### Failed Authentication Logging

All failed authentication attempts are logged:

```
[2024-03-16T10:00:00.000Z] [WARN] auth - Unauthorized access attempt { path: '/certs' }
```

## API Key Management

### Generating Strong API Keys

Use cryptographically secure random strings:

```bash
# Generate 64-character hex string
openssl rand -hex 32

# Generate base64 string
openssl rand -base64 32

# Generate alphanumeric string
openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32
```

### API Key Best Practices

1. **Minimum Length**: Use at least 32 characters
2. **Random Generation**: Use cryptographically secure random generators
3. **Regular Rotation**: Rotate keys every 90 days
4. **Separate Keys**: Use different keys for different environments
5. **Secure Storage**: Never commit keys to version control

### Storing API Keys

**❌ Don't:**
```yaml
# config.yaml
server:
  apiKey: "hardcoded-secret-key-123"
```

**✅ Do:**
```yaml
# config.yaml
server:
  apiKey: "${API_KEY}"
```

```bash
# .env file (add to .gitignore!)
API_KEY=$(openssl rand -hex 32)

# Load environment
source .env
```

## File Permissions

### Storage Directory Permissions

```bash
# Create directories with proper permissions
sudo mkdir -p /var/lib/cert-manager

# Set ownership
sudo chown -R certmanager:certmanager /var/lib/cert-manager

# Set base directory permissions
sudo chmod 755 /var/lib/cert-manager

# Set subdirectories (restrictive)
sudo chmod 700 /var/lib/cert-manager/clientCerts
sudo chmod 700 /var/lib/cert-manager/CACerts
sudo chmod 700 /var/lib/cert-manager/metaData
sudo chmod 700 /var/lib/cert-manager/audit
```

### File Permissions

| File Type | Permission | Owner | Group |
|-----------|-----------|-------|-------|
| Private Keys (`*.key`) | 0600 | certmanager | certmanager |
| Certificates (`*.crt`) | 0644 | certmanager | certmanager |
| Metadata (`*.json`) | 0600 | certmanager | certmanager |
| Audit Logs (`*.log`) | 0600 | certmanager | certmanager |
| Config (`config.yaml`) | 0600 | certmanager | certmanager |

### Checking Permissions

```bash
# Check directory permissions
ls -la /var/lib/cert-manager/

# Check file permissions
find /var/lib/cert-manager -type f -ls

# Fix incorrect permissions
sudo find /var/lib/cert-manager -name "*.key" -exec chmod 600 {} \;
sudo find /var/lib/cert-manager -name "*.crt" -exec chmod 644 {} \;
```

## Network Security

### HTTPS Configuration

Always use HTTPS for CA Server communication:

```yaml
# ✅ Good
caServer:
  url: "https://ca-server.example.com"

# ❌ Bad - Never use HTTP in production
caServer:
  url: "http://ca-server.example.com"
```

### Reverse Proxy Security

If using a reverse proxy (Nginx/Apache):

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name cert-manager.example.com;

    # Strong SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3111;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3111/tcp  # cert-manager (if not behind reverse proxy)
sudo ufw enable

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3111/tcp
sudo firewall-cmd --reload
```

## Certificate Storage

### Private Key Protection

Private keys are the most sensitive data:

1. **File Permissions**: 0600 (owner read/write only)
2. **No Copies**: Avoid copying private keys to other locations
3. **Encryption at Rest**: Private keys are stored in plaintext (protected by filesystem permissions)
4. **Backup Security**: Secure backups with encryption

### Certificate Validation

The service validates certificates on:
- Storage (checks format)
- Ping (checks expiration)
- Fetch (validates from CA)

### Automatic Expiration Detection

The ping endpoint checks certificate expiration:

```bash
curl http://localhost:3111/api/v1/ping
# Returns EXPIRED status if certificate is past expiry date
```

## Audit Logging

### Audit Log Contents

All operations are logged:

```json
{
  "timestamp": "2024-03-16T10:00:00.000Z",
  "operation": "FETCH",
  "result": "SUCCESS",
  "details": {
    "version": "v-2024-03-16T10-00-00.000Z"
  }
}
```

Operations logged:
- `FETCH` - Certificate fetch from CA
- `DECRYPT` - PFX decryption
- `STORE` - Certificate storage
- `ROLLBACK` - Automatic/manual rollback
- `API_ACCESS` - API endpoint access

### Audit Log Protection

```bash
# Secure audit logs
sudo chmod 700 /var/lib/cert-manager/audit
sudo chmod 600 /var/lib/cert-manager/audit/*.log

# Regular log rotation
# See deployment guide for logrotate configuration
```

### Accessing Audit Logs

```bash
# Via API (requires authentication)
curl -H "a-api-key: your-key" http://localhost:3111/api/v1/certs/audit

# Direct file access (requires root)
sudo tail -f /var/lib/cert-manager/audit/audit-$(date +%Y-%m-%d).log
```

## Backup Security

### Encrypted Backups

```bash
# Create encrypted backup
tar -czf - /var/lib/cert-manager | \
  gpg --symmetric --cipher-algo AES256 \
  --output backup-$(date +%Y%m%d).tar.gz.gpg

# Decrypt backup
gpg --decrypt backup-20240316.tar.gz.gpg | tar -xzf -
```

### Backup Script

```bash
#!/bin/bash
# /usr/local/bin/cert-manager-backup.sh

BACKUP_DIR="/backup/cert-manager"
GPG_RECIPIENT="backup@example.com"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create encrypted backup
tar -czf - /var/lib/cert-manager /opt/cert-manager/config.yaml 2>/dev/null | \
  gpg --encrypt --recipient "$GPG_RECIPIENT" \
  --output "$BACKUP_DIR/cert-manager_$DATE.tar.gz.gpg"

# Set permissions
chmod 600 "$BACKUP_DIR/cert-manager_$DATE.tar.gz.gpg"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.gpg" -mtime +7 -delete

echo "Backup completed: $DATE"
```

## Incident Response

### API Key Compromise

If API key is compromised:

1. **Revoke old key**:
   ```bash
   # Generate new key
   NEW_KEY=$(openssl rand -hex 32)
   
   # Update config
   sed -i "s/\${API_KEY}/$NEW_KEY/" config.yaml
   
   # Restart service
   pm2 restart cert-manager
   ```

2. **Review audit logs**:
   ```bash
   # Check for unauthorized access
   grep "Unauthorized" /var/log/cert-manager/*.log
   ```

3. **Update clients**:
   - Distribute new API key
   - Verify all clients updated

### Private Key Compromise

If private key is compromised:

1. **Revoke certificate** at CA Server
2. **Generate new certificate pair**
3. **Force certificate fetch**:
   ```bash
   curl -X POST -H "a-api-key: key" http://localhost:3111/api/v1/certs
   ```

4. **Audit access**:
   ```bash
   # Check who accessed the key
   sudo ausearch -f /var/lib/cert-manager/clientCerts/client.key
   ```

### CA Server Compromise

If CA Server is compromised:

1. **Disable scheduler**:
   ```yaml
   scheduler:
     enabled: false
   ```

2. **Verify existing certificates**:
   ```bash
   openssl x509 -in /var/lib/cert-manager/clientCerts/client.crt -text -noout
   ```

3. **Contact CA administrator**

## Security Checklist

### Pre-Production

- [ ] Strong API key generated (min 32 chars)
- [ ] API key stored in environment variable
- [ ] HTTPS enabled for CA Server
- [ ] Storage directory permissions set (0700)
- [ ] Private key files have 0600 permissions
- [ ] Firewall configured
- [ ] Audit logging enabled
- [ ] Backup encryption configured
- [ ] Service runs as non-root user
- [ ] Log rotation configured

### Regular Maintenance

- [ ] Review audit logs weekly
- [ ] Rotate API keys every 90 days
- [ ] Verify file permissions monthly
- [ ] Test backup restoration quarterly
- [ ] Review firewall rules annually
- [ ] Update dependencies monthly
- [ ] Security scan (npm audit)

## Security Tools

### File Integrity Monitoring

```bash
# Install AIDE
sudo apt-get install aide

# Initialize database
sudo aideinit

# Check integrity
sudo aide --check

# Add to crontab for daily checks
0 3 * * * /usr/bin/aide --check | mail -s "AIDE Check" admin@example.com
```

### Vulnerability Scanning

```bash
# NPM audit
npm audit

# Fix vulnerabilities
npm audit fix

# Or update specific package
npm update package-name
```

### Log Analysis

```bash
# Failed authentication attempts
grep "Unauthorized" /var/log/cert-manager/*.log | wc -l

# Certificate operations
grep "Certificate" /var/lib/cert-manager/audit/*.log | tail -20

# Error analysis
grep "ERROR" /var/log/cert-manager/*.log | tail -20
```

---

**See Also:**
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Configuration](CONFIGURATION.md) - Configuration reference
- [API Documentation](API.md) - API reference