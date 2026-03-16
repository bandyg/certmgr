# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2024-03-16

### Added

#### Core Features
- **PFX Certificate Management**: Fetch, decrypt, and store PFX certificates from CA Server
- **Automatic Updates**: Daily certificate checks at configurable time (default: 9 AM)
- **Version Backup**: Automatic backup of each certificate version with metadata
- **Automatic Rollback**: Self-healing system with automatic rollback after 3 consecutive ping failures

#### API Endpoints
- `GET /api/v1/ping` - Health check endpoint (no auth required)
- `GET /api/v1/certs` - Get certificate status and file paths
- `POST /api/v1/certs` - Fetch and store new certificate
- `GET /api/v1/certs/status` - Get detailed certificate information
- `GET /api/v1/certs/versions` - List all certificate versions
- `GET /api/v1/certs/audit` - Get audit log entries
- `GET /api/v1/certs/download/:type` - Download certificate files

#### Security
- Bearer Token authentication with timing-safe comparison
- File permission management (private keys: 0600, certs: 0644)
- Structured audit logging for all operations
- API endpoint authentication logging

#### Automation
- Daily certificate check scheduler using node-schedule
- Automatic certificate fetch on update detection
- PM2 cron restart configuration for daily reload
- Automatic rollback mechanism for failure recovery

#### Testing
- Comprehensive test suite with 104 tests
- Coverage for all core services and middleware
- Jest testing framework with TypeScript support

### Technical Details

#### Architecture
- Node.js 18+ with TypeScript
- Express.js REST API framework
- node-forge for PFX decryption
- node-schedule for job scheduling
- winston for logging

#### File Structure
```
storage/
├── clientCerts/     # Client certificates (0700)
├── CACerts/        # CA certificates (0700)
├── metaData/       # Version history (0700)
└── audit/          # Audit logs (0700)
```

#### Configuration
- YAML-based configuration
- Environment variable support
- Separate configs for dev/production

### Documentation
- Comprehensive README with quick start
- Detailed deployment guide
- Complete API documentation
- Configuration reference
- Security best practices guide
- Docker deployment support

## Epic Breakdown

### Epic 1: Certificate Acquisition & Storage ✅
- Story 1.1: Project Initialization
- Story 1.2: PFX Certificate Fetching
- Story 1.3: PFX Decryption
- Story 1.4: Certificate Storage
- Story 1.5: Version Backup

### Epic 2: Certificate Update Automation ✅
- Story 2.1: Daily Certificate Check
- Story 2.2: Auto-Update Integration
- Story 2.3: Daily Restart

### Epic 3: Certificate API & Monitoring ✅
- Story 3.1: Certificate API Endpoints
- Story 3.2: Status API
- Story 3.3: Versions List API
- Story 3.4: Authentication

### Epic 4: Reliability & Rollback ✅
- Story 4.1: Ping Health Check
- Story 4.2: Automatic Rollback
- Story 4.3: Audit Logging

## Notes

- All 19 Functional Requirements (FRs) implemented
- 100% of acceptance criteria met
- Production-ready with comprehensive test coverage
- Security-first design with audit trails