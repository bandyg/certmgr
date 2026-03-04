# Certificate & CA Manager Service Specification

## Project Overview

- **Project Name**: cert-manager
- **Type**: Node.js/Bun REST API Service
- **Core Functionality**: Manages TLS certificates and CA certificates for gRPC mutual TLS and server CAs, providing secure storage with CRUD operations
- **Target Users**: Internal microservices requiring certificate storage and retrieval

## Functionality Specification

### Core Features

1. **Certificate Management**
   - Store client certificates (for mTLS)
   - Store server certificates
   - Store CA certificates
   - Support PEM format storage

2. **CRUD Operations**
   - Create: Add new certificates with metadata
   - Read: Retrieve certificates by ID or name
   - Update: Update certificate metadata
   - Delete: Remove certificates

3. **Secure Storage**
   - Store certificates in protected directory (`/var/lib/cert-manager/certs`)
   - Set restrictive file permissions (600 for private keys, 644 for certs)
   - Use separate subdirectories for different cert types

4. **Logging**
   - Use log4js for structured logging
   - Log all API requests and operations
   - Include correlation IDs for traceability

### Data Model

**Certificate Entity**:
```typescript
interface Certificate {
  id: string;              // UUID
  name: string;            // Unique name identifier
  type: 'client' | 'server' | 'ca';
  cert: string;            // PEM encoded certificate
  key?: string;            // PEM encoded private key (optional, for client/server)
  ca?: string;             // PEM encoded CA chain (optional)
  metadata: {
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    subject?: string;
    issuer?: string;
  };
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/certs | Create a new certificate |
| GET | /api/v1/certs | List all certificates |
| GET | /api/v1/certs/:id | Get certificate by ID |
| PUT | /api/v1/certs/:id | Update certificate |
| DELETE | /api/v1/certs/:id | Delete certificate |
| GET | /api/v1/certs/:id/download | Download certificate file |
| GET | /api/v1/health | Health check endpoint |

### Security

- API authentication via API key header (`X-API-Key`)
- Certificates stored with owner-only read/write permissions
- Private keys never returned in API responses (only downloadable)
- Input validation on all endpoints

## Technical Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Logging**: log4js
- **Storage**: File system with secure permissions

## Acceptance Criteria

1. Service starts and exposes API on configured port
2. All CRUD operations work correctly
3. Certificates are stored with proper file permissions
4. Logging captures all operations
5. Health endpoint returns service status
6. API key authentication is enforced
7. Unit tests pass for core functionality
