---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/architecture.md"]
---

# cert-manager - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cert-manager, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: cert-manager can fetch PFX format certificates from CA Server
FR2: cert-manager can decrypt PFX file to extract .crt certificate
FR3: cert-manager can decrypt PFX file to extract .key private key
FR4: cert-manager can save decrypted certificates to clientCerts/ directory
FR5: cert-manager can save decrypted private keys to clientCerts/ directory
FR6: cert-manager can save CA certificate chain to CACerts/ directory
FR7: cert-manager can backup each version of certificate to metaData/ directory
FR8: cert-manager can automatically check for certificate updates daily
FR9: cert-manager can automatically download and store when new certificate is detected
FR10: gRPC service can load certificates for mTLS communication on startup
FR11: Operations can call GET /certs to get certificates
FR12: Operations can call POST /certs/push to manually trigger certificate update
FR13: Operations can call GET /certs/status to query current certificate status
FR14: Operations can call GET /certs/versions to view historical version list
FR15: API requires Bearer Token authentication
FR16: Upper layer services can call Ping API to check if certificate is valid
FR17: cert-manager can automatically rollback to previous version after 3 Ping failures
FR18: System restarts automatically at 9 AM daily and loads latest certificate
FR19: cert-manager needs to record audit logs for all certificate operations

### NonFunctional Requirements

NFR1: Performance - API response < 2s, decryption < 1s, restart interruption < 5 min
NFR2: Security - Private key file permissions 0600, Bearer Token auth, audit logging
NFR3: Scalability - Supports 10-30 clients with per-client certificate storage
NFR4: Reliability - 99.99% availability, < 5 min recovery, automatic rollback mechanism

### Additional Requirements

- Manual Setup: No database, lightweight Express setup recommended
- Tech Stack: Node.js + TypeScript, Express.js, node-forge, PM2, Jest, ESLint + Prettier
- Authentication: jsonwebtoken for Bearer Token validation
- Starter Template: Project initialization should be Epic 1 Story 1

### UX Design Requirements

(No UX Design document found - skipping)

### FR Coverage Map

FR1: Epic 1 - Fetch PFX certificate from CA Server
FR2: Epic 1 - Decrypt PFX to extract .crt certificate
FR3: Epic 1 - Decrypt PFX to extract .key private key
FR4: Epic 1 - Save decrypted certificates to clientCerts/
FR5: Epic 1 - Save decrypted private keys to clientCerts/
FR6: Epic 1 - Save CA certificate chain to CACerts/
FR7: Epic 1 - Backup each version to metaData/
FR8: Epic 2 - Daily automatic certificate update check
FR9: Epic 2 - Auto download and store new certificates
FR10: Epic 2 - gRPC service loads certificates on startup
FR11: Epic 3 - GET /certs endpoint
FR12: Epic 3 - POST /certs/push endpoint
FR13: Epic 3 - GET /certs/status endpoint
FR14: Epic 3 - GET /certs/versions endpoint
FR15: Epic 3 - Bearer Token authentication
FR16: Epic 4 - Ping API for health check
FR17: Epic 4 - Automatic rollback on 3 Ping failures
FR18: Epic 2 - Daily 9 AM restart
FR19: Epic 4 - Audit logging for all operations

## Epic List

### Epic 1: Certificate Acquisition & Storage
cert-manager can securely obtain and store certificates from CA Server
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

### Epic 2: Certificate Update Automation
System automatically keeps certificates up-to-date without manual intervention
**FRs covered:** FR8, FR9, FR10, FR18

### Epic 3: Certificate API & Monitoring
Operations personnel can monitor and manage certificates via REST APIs
**FRs covered:** FR11, FR12, FR13, FR14, FR15

### Epic 4: Reliability & Rollback
System maintains 99.99% availability with automatic failure recovery
**FRs covered:** FR16, FR17, FR19

---

## Epic 1: Certificate Acquisition & Storage

### Story 1.1: Project Initialization

**As a** Developer,
**I want** a basic Node.js + TypeScript project structure with Express,
**So that** I can build the cert-manager service on a solid foundation.

**Acceptance Criteria:**

**Given** a clean development environment
**When** I run `npm install` and `npm run build`
**Then** the project compiles without errors
**And** TypeScript types are properly configured

**Given** the project structure defined in architecture.md
**When** I examine the src/ directory
**Then** it includes api/, services/, middleware/, types/, utils/ folders

---

### Story 1.2: PFX Certificate Fetching

**As a** cert-manager service,
**I want** to fetch PFX format certificates from CA Server,
**So that** I can obtain certificates needed for mTLS communication.

**Acceptance Criteria:**

**Given** CA Server is accessible with valid credentials
**When** the service makes a REST API call to fetch PFX
**Then** a PFX file is returned and saved to temp storage
**And** the file is saved as `{timestamp}.pfx`

**Given** CA Server is unreachable
**When** the service attempts to fetch PFX
**Then** an appropriate error is logged
**And** the service retains existing certificate if available

---

### Story 1.3: PFX Decryption

**As a** cert-manager service,
**I want** to decrypt PFX files and extract certificates,
**So that** I can obtain .crt, .key, and CA chain files for use.

**Acceptance Criteria:**

**Given** a valid PFX file with password
**When** the service decrypts the PFX
**Then** .crt, .key files are extracted
**And** CA certificate chain is also extracted

**Given** an invalid PFX password
**When** decryption is attempted
**Then** an error is logged with "invalid password" message
**And** the operation fails gracefully

**Given** a corrupted PFX file
**When** decryption is attempted
**Then** an error is logged
**And** no partial files are left in storage

---

### Story 1.4: Certificate Storage

**As a** cert-manager service,
**I want** to store certificates in appropriate directories,
**So that** gRPC services can load them for mTLS communication.

**Acceptance Criteria:**

**Given** decrypted certificate files
**When** storing to disk
**Then** client.crt is saved to storage/clientCerts/
**And** client.key is saved to storage/clientCerts/ with 0600 permissions
**And** ca-chain.crt is saved to storage/CACerts/

**Given** existing certificates in storage
**When** new certificates are stored
**Then** the old certificates are preserved in metaData/

---

### Story 1.5: Version Backup

**As a** cert-manager service,
**I want** to backup each certificate version to metaData/,
**So that** I can rollback to previous versions when needed.

**Acceptance Criteria:**

**Given** a new certificate is stored
**When** the storage operation completes
**Then** a backup is created in storage/metaData/{version}/
**And** versions.json is updated with new version entry

**Given** I need to list all versions
**When** I query the versions API
**Then** all version IDs and timestamps are returned

---

## Epic 2: Certificate Update Automation

### Story 2.1: Daily Certificate Check

**As a** cert-manager service,
**I want** to automatically check for certificate updates daily,
**So that** certificates are refreshed before expiration.

**Acceptance Criteria:**

**Given** the system is running
**When** the daily check timer triggers (9 AM)
**Then** the service contacts CA Server to check for new certificates
**And** logs the check result

**Given** a new certificate is available
**When** daily check runs
**Then** the new certificate is automatically fetched
**And** the previous certificate is backed up to metaData/

---

### Story 2.2: Auto-Update Integration

**As a** cert-manager service,
**I want** to automatically update certificates when new ones are detected,
**So that** the system always has valid certificates.

**Acceptance Criteria:**

**Given** a new certificate is detected
**When** the auto-update process runs
**Then** the PFX is fetched from CA Server
**And** the PFX is decrypted
**And** the new certificates are stored to storage/clientCerts/
**And** old certificates are backed up to metaData/

**Given** the auto-update fails (network, CA unavailable)
**When** the update process encounters an error
**Then** the existing certificate is retained
**And** an error is logged
**And** the system continues using the current valid certificate

---

### Story 2.3: Daily Restart

**As a** cert-manager service,
**I want** to restart daily at 9 AM to load new certificates,
**So that** gRPC services get fresh certificates on startup.

**Acceptance Criteria:**

**Given** PM2 is configured
**When** the 9 AM restart timer triggers
**Then** the Node.js process is restarted
**And** on startup, it loads certificates from storage/clientCerts/

**Given** PM2 configuration
**When** the service starts
**Then** it loads the latest certificates from storage
**And** logs the loaded certificate version

---

## Epic 3: Certificate API & Monitoring

### Story 3.1: Certificate API Endpoints

**As a** Operations personnel,
**I want** to fetch certificates via REST API,
**So that** I can obtain certificates for gRPC services.

**Acceptance Criteria:**

**Given** valid Bearer Token authentication
**When** I call POST /certs
**Then** the service fetches new PFX from CA Server
**And** decrypts and stores the certificates
**And** returns success response

**Given** valid Bearer Token authentication
**When** I call GET /certs
**Then** the current certificate files are returned
**And** the response includes certificate metadata

**Given** invalid or missing Bearer Token
**When** I call any /certs endpoint
**Then** 401 Unauthorized is returned

---

### Story 3.2: Status API

**As a** Operations personnel,
**I want** to query certificate status via API,
**So that** I can monitor certificate health.

**Acceptance Criteria:**

**Given** valid authentication
**When** I call GET /certs/status
**Then** I receive current certificate version
**And** certificate expiry date
**And** certificate subject/issuer info
**And** days until expiration

**Given** no certificate exists
**When** I call GET /certs/status
**Then** a "no certificate" message is returned
**And** 200 OK status is returned (empty state)

---

### Story 3.3: Versions List API

**As a** Operations personnel,
**I want** to view historical certificate versions,
**So that** I can track certificate changes and rollback if needed.

**Acceptance Criteria:**

**Given** valid authentication
**When** I call GET /certs/versions
**Then** I receive a list of all certificate versions
**And** each entry includes version ID, timestamp, and status

**Given** no certificates exist
**When** I call GET /certs/versions
**Then** an empty list is returned

---

### Story 3.4: Authentication

**As a** cert-manager service,
**I want** to secure all API endpoints with Bearer Token,
**So that** only authorized personnel can access certificate operations.

**Acceptance Criteria:**

**Given** a request with valid Bearer Token
**When** the request hits any /certs endpoint
**Then** the request is processed normally

**Given** a request with invalid Bearer Token
**When** the request hits any /certs endpoint
**Then** 401 Unauthorized is returned
**And** the invalid token attempt is logged

**Given** a request with missing Bearer Token
**When** the request hits any /certs endpoint
**Then** 401 Unauthorized is returned

---

## Epic 4: Reliability & Rollback

### Story 4.1: Ping Health Check

**As a** gRPC service,
**I want** to verify certificate validity via Ping API,
**So that** I can detect certificate issues before they cause failures.

**Acceptance Criteria:**

**Given** a valid certificate is loaded
**When** Ping API is called
**Then** "OK" is returned
**And** certificate version is included in response

**Given** no certificate is loaded
**When** Ping API is called
**Then** "NO_CERT" is returned
**And** appropriate error status

**Given** an expired certificate is loaded
**When** Ping API is called
**Then** "EXPIRED" is returned
**And** expiry date is included in response

---

### Story 4.2: Automatic Rollback

**As a** cert-manager service,
**I want** to automatically rollback to previous certificate version after 3 Ping failures,
**So that** gRPC services can continue operating with valid certificates.

**Acceptance Criteria:**

**Given** Ping fails 3 consecutive times
**When** the failure count threshold is reached
**Then** the service automatically rolls back to previous certificate version
**And** logs the rollback event
**And** notifies via status API

**Given** no previous version exists
**When** rollback is triggered
**Then** an alert is logged
**And** the system remains with current certificate

**Given** rollback is triggered
**When** the previous version is loaded
**Then** the new "current" version is the rolled-back version
**And** metadata is updated accordingly

---

### Story 4.3: Audit Logging

**As a** cert-manager service,
**I want** to log all certificate operations,
**So that** I can meet compliance requirements and troubleshoot issues.

**Acceptance Criteria:**

**Given** a certificate operation occurs (fetch, decrypt, store, rollback)
**When** the operation completes
**Then** the operation is logged with timestamp
**And** operation type and outcome
**And** relevant metadata (version, filename)

**Given** I need to review audit history
**When** I examine the logs
**Then** I can see all certificate operations
**And** each entry includes: timestamp, operation, result, details
