# Story 1.2: PFX Certificate Fetching

Status: done

## Story

As a cert-manager service,
I want to fetch PFX format certificates from CA Server,
so that I can obtain certificates needed for mTLS communication.

## Acceptance Criteria

1. **Given** CA Server is accessible with valid credentials **When** the service makes a REST API call to fetch PFX **Then** a PFX file is returned and saved to temp storage **And** the file is saved as `{timestamp}.pfx`

2. **Given** CA Server is unreachable **When** the service attempts to fetch PFX **Then** an appropriate error is logged **And** the service retains existing certificate if available

## Tasks / Subtasks

- [x] Task 1: Create CA Server client/service
  - [x] Subtask 1.1: Define CA Server configuration in config.yaml
  - [x] Subtask 1.2: Create CA client service interface
  - [x] Subtask 1.3: Implement HTTP client to fetch PFX
- [x] Task 2: Implement PFX fetching logic
  - [x] Subtask 2.1: Create fetchPfx() method
  - [x] Subtask 2.2: Handle authentication to CA Server
  - [x] Subtask 2.3: Save fetched PFX to temp storage
- [x] Task 3: Handle errors gracefully
  - [x] Subtask 3.1: Log errors appropriately
  - [x] Subtask 3.2: Retain existing certificate on failure
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test successful fetch
  - [x] Subtask 4.2: Test error handling
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- **Runtime**: Node.js + TypeScript
- **Certificate Processing**: node-forge (PFX decryption)
- **Tech Stack**: Express.js, node-forge, jsonwebtoken

### Configuration

Added to config.yaml:
```yaml
caServer:
  url: "https://ca-server.example.com"
  authType: "api-key"  # or "certificate"
  apiKey: "ca-server-api-key"
  timeout: 30000
```

### Dependencies

No new dependencies needed - using built-in `fetch`.

### Project Context

- Using existing logger from `src/utils/logger.ts`
- Using existing config from `src/config/index.ts`
- Following existing file structure: `src/services/` for business logic

### Testing

- Mocked CA Server responses for testing
- Test both success and failure scenarios

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.2)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Added CA Server configuration to config.yaml
- Created CaClient service in src/services/caClient.ts
- Implemented fetchPfx() method with error handling
- Added checkConnection() for health checks
- Created unit tests in tests/caClient.test.ts
- Build passes, 7 tests pass
- Code review: Fixed unused import (readFileSync)

### File List

| File | Action | Description |
|------|--------|-------------|
| config.yaml | UPDATE | Added caServer configuration |
| src/config/index.ts | UPDATE | Added CaServerConfig interface |
| src/services/caClient.ts | CREATE | CA Server client service |
| src/services/index.ts | UPDATE | Export caClient |
| tests/caClient.test.ts | CREATE | Unit tests for CA client |
