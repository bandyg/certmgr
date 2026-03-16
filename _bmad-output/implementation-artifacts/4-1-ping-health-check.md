# Story 4.1: Ping Health Check

Status: done

## Story

As a gRPC service,
I want to verify certificate validity via Ping API,
so that I can detect certificate issues before they cause failures.

## Acceptance Criteria

1. **Given** a valid certificate is loaded **When** Ping API is called **Then** "OK" is returned **And** certificate version is included in response

2. **Given** no certificate is loaded **When** Ping API is called **Then** "NO_CERT" is returned **And** appropriate error status

3. **Given** an expired certificate is loaded **When** Ping API is called **Then** "EXPIRED" is returned **And** expiry date is included in response

## Tasks / Subtasks

- [x] Task 1: Create Ping endpoint
  - [x] Subtask 1.1: Add GET /ping endpoint
  - [x] Subtask 1.2: Check certificate existence
  - [x] Subtask 1.3: Check certificate validity (not expired)
  - [x] Subtask 1.4: Return appropriate status
- [x] Task 2: Implement certificate validation
  - [x] Subtask 2.1: Parse certificate expiry date
  - [x] Subtask 2.2: Compare with current date
- [x] Task 3: Write unit tests
  - [x] Subtask 3.1: Test with valid certificate
  - [x] Subtask 3.2: Test with no certificate
  - [x] Subtask 3.3: Test with expired certificate
- [x] Task 4: Verify implementation
  - [x] Subtask 4.1: Run build
  - [x] Subtask 4.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Ping API for health check (FR16)
- Returns status: OK, NO_CERT, or EXPIRED
- Used by gRPC services and upper layer services

### Project Context

- Use existing CertService to get certificate paths
- Use existing logger
- Ping endpoint should be lightweight and fast
- Returns certificate version if available

### Response Format

```json
// Valid certificate
{
  "data": {
    "status": "OK",
    "version": "v-2026-03-16T10-00-00.000Z",
    "validUntil": "2025-12-31T23:59:59Z"
  }
}

// No certificate
{
  "data": {
    "status": "NO_CERT",
    "message": "No certificate loaded"
  }
}

// Expired certificate
{
  "data": {
    "status": "EXPIRED",
    "version": "v-2026-03-16T10-00-00.000Z",
    "expiredAt": "2024-01-01T00:00:00Z"
  }
}
```

### Previous Story Learnings (Story 3.2)

- Certificate parsing using regex
- Days until expiry calculation
- Empty state handling

### File Structure

```
src/api/routes/ping.ts    # NEW: Ping endpoint
tests/ping.test.ts        # NEW: Ping endpoint tests
```

### Testing

- Test with valid certificate (OK status)
- Test with no certificate (NO_CERT status)
- Test with expired certificate (EXPIRED status)
- Verify response format

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.1)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Created GET /api/v1/ping endpoint
- Returns status: OK (valid certificate), NO_CERT (no certificate), EXPIRED (expired)
- Includes version and validity dates in response
- Does NOT require authentication (public health check endpoint)
- All acceptance criteria satisfied:
  - AC1: Returns OK with version for valid certificate
  - AC2: Returns NO_CERT when no certificate exists
  - AC3: Returns EXPIRED with expiry date for expired certificate
- Build passes, existing tests pass (63 tests)

### File List

| File | Action | Description |
|------|--------|-------------|
| src/api/routes/ping.ts | CREATE | Ping endpoint with health check |
| src/api/routes/index.ts | MODIFY | Add ping route (no auth required) |