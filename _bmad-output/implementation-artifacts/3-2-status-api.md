# Story 3.2: Status API

Status: done

## Story

As a Operations personnel,
I want to query certificate status via API,
so that I can monitor certificate health.

## Acceptance Criteria

1. **Given** valid authentication **When** I call GET /certs/status **Then** I receive current certificate version **And** certificate expiry date **And** certificate subject/issuer info **And** days until expiration

2. **Given** no certificate exists **When** I call GET /certs/status **Then** a "no certificate" message is returned **And** 200 OK status is returned (empty state)

## Tasks / Subtasks

- [x] Task 1: Create status endpoint
  - [x] Subtask 1.1: Add GET /certs/status endpoint
  - [x] Subtask 1.2: Extract certificate status info
  - [x] Subtask 1.3: Calculate days until expiration
- [x] Task 2: Handle empty state
  - [x] Subtask 2.1: Return appropriate message when no certificate exists
  - [x] Subtask 2.2: Return 200 with empty state info
- [x] Task 3: Write unit tests
  - [x] Subtask 3.1: Test status endpoint with valid certificate
  - [x] Subtask 3.2: Test status endpoint with no certificate
- [x] Task 4: Verify implementation
  - [x] Subtask 4.1: Run build
  - [x] Subtask 4.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- API endpoint: GET /certs/status
- Response format: JSON with status info
- Bearer Token authentication

### Project Context

- Use existing authenticate middleware
- Use existing CertService to get certificate paths
- Use node-forge for certificate parsing (if needed)
- Certificate stored in storage/clientCerts/client.crt

### Status Information to Return

```json
{
  "data": {
    "version": "v-2026-03-16T10-00-00.000Z",
    "exists": true,
    "subject": "CN=test-client,O=Test Org",
    "issuer": "CN=test-ca,O=CA Org",
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": "2025-12-31T23:59:59Z",
    "daysUntilExpiry": 289,
    "isValid": true
  }
}
```

### Empty State Response

```json
{
  "data": {
    "exists": false,
    "message": "No certificate found"
  }
}
```

### Previous Story Learnings (Story 3.1)

- Certificate metadata extraction using regex pattern matching
- Error handling with proper status codes
- Authentication middleware already applied at route level
- Tests using supertest for API testing

### File Structure

```
src/api/routes/certs.ts    # Add status endpoint
src/types/api.ts           # Add StatusResponse type
tests/certsApi.test.ts     # Add status endpoint tests
```

### Testing

- Test with valid certificate (all fields populated)
- Test with no certificate (empty state)
- Test authentication still applies

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.2)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Added GET /certs/status endpoint to certs.ts
- Returns certificate status with: version, subject, issuer, validity dates, days until expiry
- Calculates days until expiry from validUntil date
- Handles empty state when no certificate exists (returns 200 with exists: false)
- Added StatusMetadata interface and parseCertificateStatus function
- All acceptance criteria satisfied:
  - AC1: Returns version, expiry, subject, issuer, days until expiry
  - AC2: Returns 200 with empty state message when no certificate
- 44 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/api/routes/certs.ts | MODIFY | Add status endpoint and helper functions |
| tests/certsApi.test.ts | MODIFY | Add status endpoint tests |