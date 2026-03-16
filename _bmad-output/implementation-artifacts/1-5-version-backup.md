# Story 1.5: Version Backup

Status: review

## Story

As a cert-manager service,
I want to backup each certificate version to metaData/,
so that I can rollback to previous versions when needed.

## Acceptance Criteria

1. **Given** a new certificate is stored **When** the storage operation completes **Then** a backup is created in storage/metaData/{version}/ **And** versions.json is updated with new version entry

2. **Given** I need to list all versions **When** I query the versions API **Then** all version IDs and timestamps are returned

## Tasks / Subtasks

- [x] Task 1: Create version management service
  - [x] Subtask 1.1: Create VersionService class
  - [x] Subtask 1.2: Implement backupVersion() method
- [x] Task 2: Implement version tracking
  - [x] Subtask 2.1: Create versions.json file
  - [x] Subtask 2.2: Add version entries on certificate store
- [x] Task 3: Implement version listing
  - [x] Subtask 3.1: Implement getVersions() method
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test version backup
  - [x] Subtask 4.2: Test version listing
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Version storage: storage/metaData/{version}/
- Version tracking: versions.json

### Project Context

- Using existing CertService from Story 1.4
- Using existing logger from `src/utils/logger.ts`
- Integrate with existing storage directories

### Dependencies

No new dependencies needed - using existing fs operations.

### Version Management

- Store version metadata in versions.json
- Each version includes: id, timestamp, status
- Backup certificate files per version

### Testing

- Created unit tests for version service

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.5)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Created VersionService in src/services/versionService.ts
- Implemented backupVersion() to create version backups
- Implemented getVersions() to list all versions
- Implemented getVersion() to get specific version
- Implemented rollbackToVersion() for rollback capability
- Created unit tests in tests/versionService.test.ts
- Build passes, 20 tests pass

### File List

| File | Action | Description |
|------|--------|-------------|
| src/services/versionService.ts | CREATE | Version management service |
| src/services/index.ts | UPDATE | Export versionService |
| tests/versionService.test.ts | CREATE | Unit tests for version service |
