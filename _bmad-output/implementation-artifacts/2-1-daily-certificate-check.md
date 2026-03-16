# Story 2.1: Daily Certificate Check

Status: done

## Story

As a cert-manager service,
I want to automatically check for certificate updates daily,
so that certificates are refreshed before expiration.

## Acceptance Criteria

1. **Given** the system is running **When** the daily check timer triggers (9 AM) **Then** the service contacts CA Server to check for new certificates **And** logs the check result

2. **Given** a new certificate is available **When** daily check runs **Then** the new certificate is automatically fetched **And** the previous certificate is backed up to metaData/

## Tasks / Subtasks

- [x] Task 1: Create scheduler service
  - [x] Subtask 1.1: Create SchedulerService class
  - [x] Subtask 1.2: Implement daily check timer
- [x] Task 2: Implement certificate check logic
  - [x] Subtask 2.1: Check CA Server for new certificates
  - [x] Subtask 2.2: Compare with current certificate
  - [x] Subtask 2.3: Log check results
- [x] Task 3: Integrate with CertService
  - [x] Subtask 3.1: Trigger certificate fetch on new version
  - [x] Subtask 3.2: Backup existing certificate
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test scheduler
  - [x] Subtask 4.2: Test check logic
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Daily check at 9 AM
- Integration with CA Server for updates

### Project Context

- Using existing CertService from Story 1.4
- Using existing logger from `src/utils/logger.ts`
- Using node-schedule for scheduling

### Dependencies

- `node-schedule` - for scheduling daily checks

### File Structure

```
src/services/
  ├── certService.ts    # From Story 1.4
  ├── schedulerService.ts # NEW: Daily scheduler
  └── ...
```

### Testing

- Created unit tests for scheduler service

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 2, Story 2.1)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Installed node-schedule dependency
- Created SchedulerService in src/services/schedulerService.ts
- Implemented daily check at configured time (default 9 AM)
- Integrated with CertService for certificate fetching
- Integrated with VersionService for version backup
- Created unit tests in tests/schedulerService.test.ts
- Code review: Changed require('fs') to ES6 import for consistency
- Build passes, tests pass

### Change Log
- 2026-03-16: Code review fix - replaced require('fs') with ES6 import
- Refactored to use AutoUpdateService (Story 2.2) for cleaner separation of concerns

### File List

| File | Action | Description |
|------|--------|-------------|
| package.json | UPDATE | Added node-schedule dependency |
| config.yaml | UPDATE | Added scheduler config |
| src/config/index.ts | UPDATE | Added SchedulerConfig interface |
| src/services/schedulerService.ts | CREATE | Daily certificate check scheduler |
| src/services/index.ts | UPDATE | Export schedulerService |
| tests/schedulerService.test.ts | CREATE | Unit tests for scheduler |
