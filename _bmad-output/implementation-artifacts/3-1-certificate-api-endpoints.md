# Story 3.1: Certificate API Endpoints

Status: done

## Story

As a Operations personnel,
I want to fetch certificates via REST API,
so that I can obtain certificates for gRPC services.

## Acceptance Criteria

1. **Given** valid Bearer Token authentication **When** I call POST /certs **Then** the service fetches new PFX from CA Server **And** decrypts and stores the certificates **And** returns success response

2. **Given** valid Bearer Token authentication **When** I call GET /certs **Then** the current certificate files are returned **And** the response includes certificate metadata

3. **Given** invalid or missing Bearer Token **When** I call any /certs endpoint **Then** 401 Unauthorized is returned

## Tasks / Subtasks

- [x] Task 1: Update API routes for certificate management
  - [x] Subtask 1.1: Add POST /certs endpoint to trigger certificate fetch
  - [x] Subtask 1.2: Add GET /certs endpoint to get current certificates
  - [x] Subtask 1.3: Apply authentication middleware to all /certs routes
- [x] Task 2: Implement certificate metadata response
  - [x] Subtask 2.1: Parse certificate to extract subject, issuer, expiry
  - [x] Subtask 2.2: Include file paths in response
- [x] Task 3: Write unit tests
  - [x] Subtask 3.1: Test POST /certs with authentication
  - [x] Subtask 3.2: Test GET /certs with authentication
  - [x] Subtask 3.3: Test 401 for unauthenticated requests
- [x] Task 4: Verify implementation
  - [x] Subtask 4.1: Run build
  - [x] Subtask 4.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:- API framework: Express.js
- Authentication: Bearer Token (via API Key header)
- Response format: JSON with data wrapper

### Project Context

- Use existing auth middleware from `src/middleware/auth.ts`
- Use existing CertService from Story 1.4 for certificate operations
- Use existing logger from `src/utils/logger.ts`
- API Key is passed via `a-api-key` header

### Current Implementation

The existing `src/api/routes/certs.ts` uses a different storageService for CRUD operations. This needs to be refactored to work with the actual certificate storage (storage/clientCerts/) using CertService.

### Endpoints to Implement

```
POST /api/v1/certs
  - Triggers certificate fetch from CA Server
  - Uses certService.fetchAndStoreCertificate()
  - Returns:{ data: { version, timestamp, files } }

GET /api/v1/certs
  - Returns current certificates from storage
  - Reads from storage/clientCerts/  - Returns: { data: { cert, key, ca, metadata } }
```

### Authentication

- Use existing `authenticate` middleware
- API Key passed in `a-api-key` header
- Returns 401 for missing/invalid key

### File Structure

```
src/api/routes/certs.ts    # Update existing routes
src/types/api.ts           # Add API response types
tests/certsApi.test.ts     # API endpoint tests
```

### Testing

- Test with valid API key
- Test with invalid API key (expect 401)
- Test with missing API key (expect 401)
- Test certificate fetch success
- Test certificate fetch failure

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.1)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Refactored existing certs.ts routes for certificate management
- Added POST /certs endpoint to trigger certificate fetch from CA Server
- Added GET /certs endpoint to return current certificate status with metadata
- Added GET /certs/download/:type endpoint for file downloads
- Authentication applied via existing middleware
- Certificate metadata parsing extracts subject, issuer, validity dates
- All acceptance criteria satisfied:
  - AC1: POST /certs fetches new certificates with auth
  - AC2: GET /certs returns certificate files with metadata
  - AC3: 401 Unauthorized for invalid/missing API key
- 42 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/api/routes/certs.ts | MODIFY | Refactored for certificate management |
| tests/certsApi.test.ts | CREATE | API endpoint tests |
| package.json | MODIFY | Added supertest dependency |