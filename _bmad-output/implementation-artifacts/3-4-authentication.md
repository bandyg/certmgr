# Story 3.4: Authentication

Status: done

## Story

As a cert-manager service,
I want to secure all API endpoints with Bearer Token,
so that only authorized personnel can access certificate operations.

## Acceptance Criteria

1. **Given** a request with valid Bearer Token **When** the request hits any /certs endpoint **Then** the request is processed normally

2. **Given** a request with invalid Bearer Token **When** the request hits any /certs endpoint **Then** 401 Unauthorized is returned **And** the invalid token attempt is logged

3. **Given** a request with missing Bearer Token **When** the request hits any /certs endpoint **Then** 401 Unauthorized is returned

## Tasks / Subtasks

- [x] Task 1: Verify authentication middleware
  - [x] Subtask 1.1: Check authenticate middleware exists and is applied
  - [x] Subtask 1.2: Verify timing-safe comparison is used
- [x] Task 2: Create comprehensive authentication tests
  - [x] Subtask 2.1: Test valid API key allows access
  - [x] Subtask 2.2: Test invalid API key returns 401
  - [x] Subtask 2.3: Test missing API key returns 401
  - [x] Subtask 2.4: Test logging of invalid attempts
  - [x] Subtask 2.5: Test all /certs endpoints are protected
- [x] Task 3: Verify implementation
  - [x] Subtask 3.1: Run build
  - [x] Subtask 3.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Authentication: Bearer Token via `a-api-key` header
- API Key stored in config.server.apiKey
- Timing-safe comparison to prevent timing attacks

### Current Implementation

Authentication is already implemented in:
- `src/middleware/auth.ts` - authenticate middleware with timingSafeEqual
- `src/api/routes/index.ts` - applied to all /certs routes

### Implementation Details

```typescript
// authenticate middleware
- Extracts 'a-api-key' header
- Uses timingSafeEqual for secure comparison
- Returns 401 for missing/invalid keys
- Logs unauthorized access attempts
```

### Testing Requirements

Test all endpoints:
- GET /api/v1/certs
- POST /api/v1/certs
- GET /api/v1/certs/status
- GET /api/v1/certs/versions
- GET /api/v1/certs/download/:type

Test scenarios:
1. Valid API key → 200/201 success
2. Invalid API key → 401 Unauthorized
3. Missing API key → 401 Unauthorized
4. Wrong header name → 401 Unauthorized

### Previous Story Learnings

- Authentication middleware already applied at route level
- Tests use supertest with express app
- Mock services for isolated testing

### File Structure

```
src/middleware/auth.ts     # Existing authentication middleware
tests/auth.test.ts         # NEW: Comprehensive auth tests
```

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.4)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Authentication already implemented in src/middleware/auth.ts
- Verified timing-safe comparison using timingSafeEqual from crypto module
- Created comprehensive test suite in tests/auth.test.ts
- Tests cover:
  - Valid API key access (200 success)
  - Invalid API key (401 Unauthorized)
  - Missing API key (401 Unauthorized)
  - Wrong header name (401 Unauthorized)
  - Logging of unauthorized attempts
  - All /certs endpoints are protected
- All acceptance criteria satisfied:
  - AC1: Valid Bearer Token allows access
  - AC2: Invalid token returns 401 and logs attempt
  - AC3: Missing token returns 401
- 63 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/middleware/auth.ts | EXISTING | Authentication middleware with timing-safe comparison |
| tests/auth.test.ts | CREATE | Comprehensive authentication tests (17 tests) |