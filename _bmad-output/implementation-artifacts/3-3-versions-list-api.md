# Story 3.3: Versions List API

Status: done

## Story

As a Operations personnel,
I want to view historical certificate versions,
so that I can track certificate changes and rollback if needed.

## Acceptance Criteria

1. **Given** valid authentication **When** I call GET /certs/versions **Then** I receive a list of all certificate versions **And** each entry includes version ID, timestamp, and status

2. **Given** no certificates exist **When** I call GET /certs/versions **Then** an empty list is returned

## Tasks / Subtasks

- [x] Task 1: Create versions endpoint
  - [x] Subtask 1.1: Add GET /certs/versions endpoint
  - [x] Subtask 1.2: Use VersionService to get version list
  - [x] Subtask 1.3: Format response with version details
- [x] Task 2: Handle empty state
  - [x] Subtask 2.1: Return empty array when no versions exist
- [x] Task 3: Write unit tests
  - [x] Subtask 3.1: Test versions endpoint with existing versions
  - [x] Subtask 3.2: Test versions endpoint with no versions
- [x] Task 4: Verify implementation
  - [x] Subtask 4.1: Run build
  - [x] Subtask 4.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- API endpoint: GET /certs/versions
- Returns list of versions with metadata
- Bearer Token authentication

### Project Context

- Use existing authenticate middleware
- Use existing VersionService from Story 1.5
- VersionService has getVersions() method
- Versions stored in storage/metaData/versions.json

### Version Entry Format

```json
{
  "data": [
    {
      "id": "v-2026-03-16T10-00-00.000Z",
      "timestamp": "2026-03-16T10:00:00.000Z",
      "status": "active"
    }
  ]
}
```

### Empty State Response

```json
{
  "data": []
}
```

### Previous Story Learnings (Story 3.2)

- API endpoints added to existing certs.ts
- Authentication already applied at route level
- Tests using supertest with mock services

### File Structure

```
src/api/routes/certs.ts    # Add versions endpoint
tests/certsApi.test.ts     # Add versions endpoint tests
```

### Testing

- Test with multiple versions
- Test with empty versions list
- Test authentication still applies

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.3)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Added GET /certs/versions endpoint
- Uses VersionService.getVersions() to retrieve version list
- Returns formatted version entries with id, timestamp, and status
- Returns empty array when no versions exist
- All acceptance criteria satisfied:
  - AC1: Returns list of versions with id, timestamp, status
  - AC2: Returns empty list when no versions exist
- 46 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/api/routes/certs.ts | MODIFY | Add versions endpoint |
| tests/certsApi.test.ts | MODIFY | Add versions endpoint tests |