# Story 4.2: Automatic Rollback

Status: done

## Story

As a cert-manager service,
I want to automatically rollback to previous certificate version after 3 Ping failures,
so that gRPC services can continue operating with valid certificates.

## Acceptance Criteria

1. **Given** Ping fails 3 consecutive times **When** the failure count threshold is reached **Then** the service automatically rolls back to previous certificate version **And** logs the rollback event **And** notifies via status API

2. **Given** no previous version exists **When** rollback is triggered **Then** an alert is logged **And** the system remains with current certificate

3. **Given** rollback is triggered **When** the previous version is loaded **Then** the new "current" version is the rolled-back version **And** metadata is updated accordingly

## Tasks / Subtasks

- [x] Task 1: Create rollback service
  - [x] Subtask 1.1: Create RollbackService class
  - [x] Subtask 1.2: Implement failure counter
  - [x] Subtask 1.3: Implement rollback trigger logic
- [x] Task 2: Integrate with Ping endpoint
  - [x] Subtask 2.1: Track consecutive failures
  - [x] Subtask 2.2: Trigger rollback after 3 failures
- [x] Task 3: Implement rollback logic
  - [x] Subtask 3.1: Get previous version from VersionService
  - [x] Subtask 3.2: Restore certificate files
  - [x] Subtask 3.3: Update metadata
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test rollback after 3 failures
  - [x] Subtask 4.2: Test no rollback with fewer failures
  - [x] Subtask 4.3: Test no previous version case
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Automatic rollback on 3 consecutive Ping failures (FR17)
- Reliability: 99.99% availability
- Rollback mechanism for failure recovery

### Project Context

- Use existing VersionService from Story 1.5
- Use existing Ping endpoint from Story 4.1
- Use existing logger
- Track failures in memory (simple counter)

### Rollback Logic

```
On each Ping check:
  - If certificate is valid → reset failure counter
  - If certificate is invalid → increment failure counter
  - If failure counter >= 3 → trigger rollback
    - Get previous version from VersionService
    - If previous version exists:
      - Copy files from metaData/{version}/ to clientCerts/
      - Update versions.json (mark as rolled-back)
      - Reset failure counter
      - Log rollback event
    - If no previous version:
      - Log alert
      - Keep current certificate
```

### Previous Story Learnings (Story 4.1)

- Ping endpoint checks certificate validity
- Returns OK/NO_CERT/EXPIRED status
- Can be called by external services

### File Structure

```
src/services/
  ├── rollbackService.ts    # NEW: Rollback logic
  └── pingService.ts        # NEW: Ping with failure tracking
tests/rollbackService.test.ts  # NEW: Rollback tests
```

### Testing

- Test failure counter increments
- Test rollback after 3 failures
- Test no rollback with 2 failures
- Test rollback with no previous version
- Test successful rollback restores files

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.2)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Created RollbackService with failure tracking
- Failure counter increments on each ping failure
- After 3 failures, triggers automatic rollback
- Rollback finds previous archived version and restores files
- Updated Ping endpoint to track failures and trigger rollback
- Ping endpoint returns rollbackTriggered flag when rollback occurs
- All acceptance criteria satisfied:
  - AC1: After 3 failures, automatically rolls back to previous version
  - AC2: When no previous version, logs alert and keeps current
  - AC3: Updates metadata and restores files during rollback
- 73 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/services/rollbackService.ts | CREATE | Rollback service with failure tracking |
| src/api/routes/ping.ts | MODIFY | Added rollback trigger on failures |
| src/services/index.ts | MODIFY | Export rollbackService |
| tests/rollbackService.test.ts | CREATE | Rollback tests (10 tests) |