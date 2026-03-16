# Story 4.3: Audit Logging

Status: done

## Story

As a cert-manager service,
I want to log all certificate operations,
so that I can meet compliance requirements and troubleshoot issues.

## Acceptance Criteria

1. **Given** a certificate operation occurs (fetch, decrypt, store, rollback) **When** the operation completes **Then** the operation is logged with timestamp **And** operation type and outcome **And** relevant metadata (version, filename)

2. **Given** I need to review audit history **When** I examine the logs **Then** I can see all certificate operations **And** each entry includes: timestamp, operation, result, details

## Tasks / Subtasks

- [x] Task 1: Create audit logging service
  - [x] Subtask 1.1: Create AuditLogger class
  - [x] Subtask 1.2: Define audit log format
  - [x] Subtask 1.3: Implement log file rotation
- [x] Task 2: Integrate with certificate operations
  - [x] Subtask 2.1: Log fetch operations
  - [x] Subtask 2.2: Log decrypt operations
  - [x] Subtask 2.3: Log store operations
  - [x] Subtask 2.4: Log rollback operations
- [x] Task 3: Add audit log API endpoint
  - [x] Subtask 3.1: Create GET /certs/audit endpoint
  - [x] Subtask 3.2: Return recent audit entries
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test audit logging
  - [x] Subtask 4.2: Test audit log API
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Audit logging for all certificate operations (FR19)
- Security: audit logging for compliance
- Logging pattern: structured JSON logs

### Project Context

- Use existing logger from `src/utils/logger.ts`
- Audit logs should be separate from application logs
- Store audit logs in storage/audit/ directory
- Each entry should be JSON format

### Audit Log Format

```json
{
  "timestamp": "2026-03-16T10:00:00.000Z",
  "operation": "FETCH|DECRYPT|STORE|ROLLBACK|API_ACCESS",
  "result": "SUCCESS|FAILURE",
  "details": {
    "version": "v-2026-03-16T10-00-00.000Z",
    "filename": "client.crt",
    "userAgent": "...",
    "ipAddress": "..."
  }
}
```

### Operations to Log

1. **FETCH** - Certificate fetch from CA Server
2. **DECRYPT** - PFX decryption
3. **STORE** - Certificate storage
4. **ROLLBACK** - Automatic/manual rollback
5. **API_ACCESS** - API endpoint access (POST /certs, etc.)

### Previous Story Learnings (Story 4.2)

- Logger pattern using getLogger()
- Service architecture with class + singleton export
- Integration with existing services

### File Structure

```
src/services/
  └── auditService.ts      # NEW: Audit logging service
tests/auditService.test.ts  # NEW: Audit logging tests
```

### Testing

- Test audit log entry creation
- Test log file writing
- Test audit log retrieval via API

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.3)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used
big-pickle

### Debug Log References

### Completion Notes List
- Created AuditService with structured JSON logging
- Logs stored in storage/audit/audit-YYYY-MM-DD.log
- Operations logged: FETCH, DECRYPT, STORE, ROLLBACK, API_ACCESS
- Each entry includes: timestamp, operation, result, details
- Integrated audit logging into certService, rollbackService, and API routes
- Added GET /certs/audit endpoint to retrieve recent audit logs
- All acceptance criteria satisfied:
  - AC1: All operations logged with timestamp, type, outcome, metadata
  - AC2: Audit history available via API with all required fields
- 83 tests passing

### File List

| File | Action | Description |
|------|--------|-------------|
| src/services/auditService.ts | CREATE | Audit logging service |
| src/services/index.ts | MODIFY | Export auditService |
| src/services/certService.ts | MODIFY | Add audit logging for fetch/decrypt/store |
| src/services/rollbackService.ts | MODIFY | Add audit logging for rollback |
| src/api/routes/certs.ts | MODIFY | Add audit logging to API operations |
| tests/auditService.test.ts | CREATE | Audit logging tests (10 tests) |