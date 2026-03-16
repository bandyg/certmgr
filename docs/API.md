# API Documentation

Complete API reference for cert-manager.

## Base URL

```
http://localhost:3111/api/v1
```

## Authentication

All endpoints (except `/ping`) require authentication via the `a-api-key` header.

```http
a-api-key: your-api-key-here
```

## Endpoints

### Health Check

#### GET /ping

Check certificate health status. No authentication required.

**Response Codes:**
- `200` - Certificate is valid
- `503` - No certificate or expired certificate

**Response Body (Success - 200):**
```json
{
  "data": {
    "status": "OK",
    "version": "v-2026-03-16T10-00-00.000Z",
    "validUntil": "2025-12-31T23:59:59Z"
  }
}
```

**Response Body (No Certificate - 503):**
```json
{
  "data": {
    "status": "NO_CERT",
    "message": "No certificate loaded"
  }
}
```

**Response Body (Expired - 503):**
```json
{
  "data": {
    "status": "EXPIRED",
    "version": "v-2026-03-16T10-00-00.000Z",
    "expiredAt": "2024-01-01T00:00:00Z",
    "rollbackTriggered": true
  }
}
```

### Certificate Management

#### GET /certs

Get current certificate status and file paths.

**Response (200):**
```json
{
  "data": {
    "files": {
      "cert": true,
      "key": true,
      "ca": true
    },
    "paths": {
      "cert": "/var/lib/cert-manager/clientCerts/client.crt",
      "key": "/var/lib/cert-manager/clientCerts/client.key",
      "ca": "/var/lib/cert-manager/CACerts/ca-chain.crt"
    },
    "metadata": {
      "subject": "CN=test-client,O=Test Org",
      "issuer": "CN=test-ca,O=CA Org",
      "notBefore": "Jan 1 00:00:00 2024 GMT",
      "notAfter": "Dec 31 23:59:59 2025 GMT",
      "valid": true
    }
  }
}
```

#### POST /certs

Fetch and store a new certificate from the CA Server.

**Response (201 - Success):**
```json
{
  "data": {
    "success": true,
    "version": "v-2026-03-16T10-00-00.000Z"
  }
}
```

**Response (500 - Failure):**
```json
{
  "error": {
    "code": "FETCH_FAILED",
    "message": "CA Server unreachable"
  }
}
```

#### GET /certs/status

Get detailed certificate status information.

**Response (200 - Certificate Exists):**
```json
{
  "data": {
    "exists": true,
    "version": "v-2026-03-16T10-00-00.000Z",
    "subject": "CN=test-client,O=Test Org",
    "issuer": "CN=test-ca,O=CA Org",
    "validFrom": "Jan 1 00:00:00 2024 GMT",
    "validUntil": "Dec 31 23:59:59 2025 GMT",
    "daysUntilExpiry": 289,
    "isValid": true
  }
}
```

**Response (200 - No Certificate):**
```json
{
  "data": {
    "exists": false,
    "message": "No certificate found"
  }
}
```

### Version Management

#### GET /certs/versions

Get list of all certificate versions.

**Response (200):**
```json
{
  "data": [
    {
      "id": "v-2026-03-16T10-00-00.000Z",
      "timestamp": "2026-03-16T10:00:00.000Z",
      "status": "active"
    },
    {
      "id": "v-2026-03-15T10-00-00.000Z",
      "timestamp": "2026-03-15T10:00:00.000Z",
      "status": "archived"
    }
  ]
}
```

Status values: `active`, `archived`, `rolled-back`

### Audit Logs

#### GET /certs/audit

Get recent audit log entries (last 100).

**Response (200):**
```json
{
  "data": [
    {
      "timestamp": "2026-03-16T10:00:00.000Z",
      "operation": "FETCH",
      "result": "SUCCESS",
      "details": {
        "version": "v-2026-03-16T10-00-00.000Z"
      }
    },
    {
      "timestamp": "2026-03-16T10:01:00.000Z",
      "operation": "STORE",
      "result": "SUCCESS",
      "details": {
        "version": "v-2026-03-16T10-00-00.000Z"
      }
    }
  ]
}
```

Operations logged: `FETCH`, `DECRYPT`, `STORE`, `ROLLBACK`, `API_ACCESS`

### Certificate Download

#### GET /certs/download/:type

Download certificate files.

**Parameters:**
- `type` (path): File type - `cert`, `key`, or `ca`

**Response (200):**
- Content-Type: `application/x-pem-file`
- Content-Disposition: `attachment; filename="client.crt"`

**Response (400 - Invalid Type):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Type must be cert, key, or ca"
  }
}
```

**Response (404 - Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "cert file not found"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `FETCH_FAILED` | 500 | Failed to fetch from CA Server |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Examples

### cURL Examples

#### Check Health
```bash
curl http://localhost:3111/api/v1/ping
```

#### Get Certificate Status
```bash
curl -H "a-api-key: your-api-key" \
  http://localhost:3111/api/v1/certs/status
```

#### Fetch New Certificate
```bash
curl -X POST \
  -H "a-api-key: your-api-key" \
  http://localhost:3111/api/v1/certs
```

#### Download Certificate
```bash
curl -H "a-api-key: your-api-key" \
  http://localhost:3111/api/v1/certs/download/cert \
  -o client.crt
```

#### Get Audit Logs
```bash
curl -H "a-api-key: your-api-key" \
  http://localhost:3111/api/v1/certs/audit
```

### JavaScript/TypeScript Examples

```typescript
// Setup
const API_URL = 'http://localhost:3111/api/v1';
const API_KEY = 'your-api-key';

const headers = {
  'a-api-key': API_KEY,
  'Content-Type': 'application/json',
};

// Check health
const checkHealth = async () => {
  const response = await fetch(`${API_URL}/ping`);
  const data = await response.json();
  return data.data.status; // 'OK', 'NO_CERT', or 'EXPIRED'
};

// Get certificate status
const getStatus = async () => {
  const response = await fetch(`${API_URL}/certs/status`, { headers });
  return await response.json();
};

// Fetch new certificate
const fetchCertificate = async () => {
  const response = await fetch(`${API_URL}/certs`, {
    method: 'POST',
    headers,
  });
  return await response.json();
};

// Download certificate
const downloadCert = async (type: 'cert' | 'key' | 'ca') => {
  const response = await fetch(`${API_URL}/certs/download/${type}`, { headers });
  const blob = await response.blob();
  return blob;
};
```

## Rate Limiting

Currently, there are no rate limits implemented. However, it's recommended to:

- Cache certificate status checks
- Don't call `/certs` (fetch) more than necessary
- Implement client-side rate limiting for automated tools

## Webhooks (Future)

Planned feature: Webhook notifications for certificate events:

- `certificate.fetched` - New certificate fetched
- `certificate.expired` - Certificate expired
- `certificate.rolledback` - Automatic rollback occurred
- `certificate.updated` - Certificate updated

---

**See Also:**
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Configuration](CONFIGURATION.md) - Configuration reference
- [Security](SECURITY.md) - Security best practices