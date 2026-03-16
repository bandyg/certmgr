# Story 2.2: Auto-Update Integration

Status: done

## Story

As a cert-manager service,
I want to automatically update certificates when new ones are detected,
so that the system always has valid certificates.

## Acceptance Criteria

1. **Given** a new certificate is detected **When** the auto-update process runs **Then** the PFX is fetched from CA Server **And** the PFX is decrypted **And** the new certificates are stored to storage/clientCerts/ **And** old certificates are backed up to metaData/

2. **Given** the auto-update fails (network, CA unavailable) **When** the update process encounters an error **Then** the existing certificate is retained **And** an error is logged **And** the system continues using the current valid certificate

## Tasks / Subtasks

- [x] Task 1: Create auto-update service
  - [x] Subtask 1.1: Create AutoUpdateService class
  - [x] Subtask 1.2: Implement triggerUpdate() method
- [x] Task 2: Implement robust error handling
  - [x] Subtask 2.1: Retain existing certificate on failure
  - [x] Subtask 2.2: Log errors appropriately
- [x] Task 3: Integrate with scheduler
  - [x] Subtask 3.1: Call AutoUpdateService from scheduler
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test successful update
  - [x] Subtask 4.2: Test failure handling
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Auto-update on new certificate detection
- Error handling - retain existing certificate

### Project Context

- Use existing CertService from Story 1.4
- Use existing SchedulerService from Story 2.1
- Use existing logger from `src/utils/logger.ts`

### Dependencies

No new dependencies needed.

### File Structure

```
src/services/
  ├── schedulerService.ts # From Story 2.1
  ├── autoUpdateService.ts # NEW: Auto-update logic
  └── ...
```

### Testing

- Test update success
- Test failure handling and retention

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 2, Story 2.2)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Created AutoUpdateService class with isServerReachable() and triggerUpdate() methods
- Integrated with SchedulerService - scheduler now delegates to AutoUpdateService
- Added robust error handling - retains existing certificate on any failure
- Code review: Renamed checkForUpdates() to isServerReachable() for clarity
- All acceptance criteria satisfied:
  - AC1: New certificate fetched, decrypted, stored, old backed up
  - AC2: On failure, existing certificate retained, error logged, system continues

### Change Log
- 2026-03-16: Code review fix - renamed method from checkForUpdates to isServerReachable for semantic accuracy

### File List

| File | Action | Description |
|------|--------|-------------|
| src/services/autoUpdateService.ts | CREATE | Auto-update service with triggerUpdate() and isServerReachable() |
| src/services/index.ts | MODIFY | Added export for AutoUpdateService |
| src/services/schedulerService.ts | MODIFY | Integrated AutoUpdateService into scheduler |
| tests/autoUpdateService.test.ts | CREATE | Unit tests for auto-update service |
| tests/schedulerService.test.ts | MODIFY | Updated tests to mock AutoUpdateService |
