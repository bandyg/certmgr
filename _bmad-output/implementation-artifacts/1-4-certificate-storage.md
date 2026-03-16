# Story 1.4: Certificate Storage

Status: done

## Story

As a cert-manager service,
I want to store certificates in appropriate directories,
so that gRPC services can load them for mTLS communication.

## Acceptance Criteria

1. **Given** decrypted certificate files **When** storing to disk **Then** client.crt is saved to storage/clientCerts/ **And** client.key is saved to storage/clientCerts/ with 0600 permissions **And** ca-chain.crt is saved to storage/CACerts/

2. **Given** existing certificates in storage **When** new certificates are stored **Then** the old certificates are preserved in metaData/

## Tasks / Subtasks

- [x] Task 1: Create certificate service
  - [x] Subtask 1.1: Create CertService class
  - [x] Subtask 1.2: Implement storeCertificate() method
- [x] Task 2: Implement secure file storage
  - [x] Subtask 2.1: Save certificate to clientCerts/
  - [x] Subtask 2.2: Save private key with 0600 permissions
  - [x] Subtask 2.3: Save CA chain to CACerts/
- [x] Task 3: Handle existing certificates
  - [x] Subtask 3.1: Backup existing certificate before storing new
- [x] Task 4: Write unit tests
  - [x] Subtask 4.1: Test certificate storage
  - [x] Subtask 4.2: Test file permissions
- [x] Task 5: Verify implementation
  - [x] Subtask 5.1: Run build
  - [x] Subtask 5.2: Run tests

## Dev Notes

### Architecture Requirements

From architecture.md:
- Storage directories: storage/clientCerts/, storage/CACerts/, storage/metaData/
- Private key permissions: 0600

### Project Context

- Using existing StorageService from Story 1.1
- Using existing logger from `src/utils/logger.ts`
- Using PfxService from Story 1.3 for decryption results
- Using CaClient from Story 1.2 for fetching PFX

### Dependencies

No new dependencies needed - using existing fs operations.

### File Structure

```
src/services/
  ├── caClient.ts        # From Story 1.2
  ├── pfxService.ts     # From Story 1.3
  ├── storageService.ts # From Story 1.1
  ├── certService.ts    # NEW: Certificate orchestration
  └── ...
```

### Testing

- Created unit tests for certificate storage
- Test file permissions

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.4)
- Source: _bmad-output/planning-artifacts/architecture.md

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Created CertService in src/services/certService.ts
- Orchestrates fetch PFX → decrypt → store workflow
- Implements secure file storage with 0600 permissions for private keys
- Implements automatic backup of existing certificates before storing new
- Created unit tests in tests/certService.test.ts
- Build passes, 15 tests pass

### File List

| File | Action | Description |
|------|--------|-------------|
| src/services/certService.ts | CREATE | Certificate orchestration service |
| src/services/index.ts | UPDATE | Export certService |
| tests/certService.test.ts | CREATE | Unit tests for certificate service |
