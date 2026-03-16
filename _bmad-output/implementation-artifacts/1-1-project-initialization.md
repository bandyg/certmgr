# Story 1.1: Project Initialization

Status: done

## Story

As a Developer,
I want a basic Node.js + TypeScript project structure with Express,
so that I can build the cert-manager service on a solid foundation.

## Acceptance Criteria

1. **Given** a clean development environment **When** I run `npm install` and `npm run build` **Then** the project compiles without errors **And** TypeScript types are properly configured

2. **Given** the project structure defined in architecture.md **When** I examine the src/ directory **Then** it includes api/, services/, middleware/, types/, utils/ folders

## Tasks / Subtasks

- [x] Task 1: Initialize Node.js + TypeScript project
  - [x] Subtask 1.1: Initialize npm project with package.json
  - [x] Subtask 1.2: Install dependencies (Express, TypeScript, node-forge, etc.)
  - [x] Subtask 1.3: Configure TypeScript (tsconfig.json)
  - [x] Subtask 1.4: Configure build scripts
- [x] Task 2: Create project directory structure
  - [x] Subtask 2.1: Create src/api/ directory
  - [x] Subtask 2.2: Create src/services/ directory
  - [x] Subtask 2.3: Create src/middleware/ directory
  - [x] Subtask 2.4: Create src/types/ directory
  - [x] Subtask 2.5: Create src/utils/ directory
  - [x] Subtask 2.6: Create storage/ directories
- [x] Task 3: Create basic Express app setup
  - [x] Subtask 3.1: Create src/index.ts entry point
  - [x] Subtask 3.2: Create src/app.ts Express app
  - [x] Subtask 3.3: Add basic route structure
- [x] Task 4: Configure testing (AC: #1)
  - [x] Subtask 4.1: Set up Jest
  - [x] Subtask 4.2: Create sample test
- [x] Task 5: Verify build works (AC: #1)
  - [x] Subtask 5.1: Run npm run build
  - [x] Subtask 5.2: Verify no compilation errors

## Dev Notes

### Architecture Requirements

Based on architecture.md:

- **Runtime**: Node.js + TypeScript
- **Web Framework**: Express.js
- **Certificate Processing**: node-forge (PFX decryption)
- **Process Management**: PM2
- **Testing Framework**: Jest
- **Code Quality**: ESLint + Prettier

### Directory Structure (from Architecture)

```
cert-manager/
├── package.json
├── tsconfig.json
├── .env
├── .env.example
├── config.json
├── .gitignore
├── README.md
├── Dockerfile
├── docker-compose.yml
├── pm2.config.js
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── src/
│   ├── index.ts                 # Entry file
│   ├── app.ts                   # Express app
│   ├── config/
│   │   ├── index.ts             # Config loading
│   │   └── env.ts               # Environment variable types
│   ├── api/
│   │   ├── routes/
│   │   │   ├── certs.ts         # /certs routes
│   │   │   └── index.ts         # Route aggregation
│   │   └── controllers/
│   │       └── certController.ts # Certificate controller
│   ├── services/
│   │   ├── certService.ts       # Certificate business logic
│   │   ├── storageService.ts    # File storage service
│   │   └── pfxService.ts        # PFX decryption service
│   ├── middleware/
│   │   ├── auth.ts              # JWT auth middleware
│   │   └── error.ts             # Error handling middleware
│   ├── types/
│   │   ├── cert.ts              # Certificate type definitions
│   │   └── api.ts               # API response types
│   └── utils/
│       ├── logger.ts            # Logging utility
│       └── fileSystem.ts        # File operation utility
├── storage/                     # Certificate storage directory
│   ├── clientCerts/            # Client certificates
│   ├── metaData/               # Metadata/version history
│   └── temp/                   # Temporary files
└── scripts/
    └── init-storage.sh         # Storage init script
```

### Project Structure Notes

- Use camelCase for file names: `certService.ts`, `authMiddleware.ts`
- Use PascalCase for classes/interfaces: `CertService`, `AuthMiddleware`
- Use camelCase for functions/variables: `getCertStatus()`, `decryptPfx()`
- Tests should be co-located (same directory): `certService.test.ts`

### Naming Conventions (from Architecture)

- API endpoints: plural form `/certs`, `/certs/versions`
- Route parameters: colon format `/certs/:versionId`
- JSON fields: camelCase
- Date format: ISO 8601
- Boolean values: true/false

### API Response Formats (from Architecture)

Success response:
```json
{
  "data": { ... }
}
```

Error response:
```json
{
  "error": {
    "code": "CERT_NOT_FOUND",
    "message": "Certificate not found"
  }
}
```

### Dependencies to Install

```json
{
  "dependencies": {
    "express": "^4.x",
    "node-forge": "^1.x",
    "jsonwebtoken": "^9.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/express": "^4.x",
    "@types/node-forge": "^1.x",
    "@types/jsonwebtoken": "^9.x",
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "ts-jest": "^29.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "@typescript-eslint/parser": "^6.x",
    "prettier": "^3.x"
  }
}
```

### References

- Source: _bmad-output/planning-artifacts/architecture.md (sections: Starter Template Evaluation, Core Architectural Decisions, Directory Structure)
- Source: _bmad-output/planning-artifacts/prd.md (sections: Technical Architecture, Implementation Considerations)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Updated package.json with build scripts
- Configured TypeScript for Node.js (commonjs module)
- Reorganized src/ directory to match architecture (api/, services/, middleware/, types/, utils/)
- Created API routes at src/api/routes/certs.ts
- Created auth middleware at src/middleware/auth.ts (fixed timing attack vulnerability)
- Created error middleware at src/middleware/error.ts
- Created storage service at src/services/storageService.ts
- Created config module at src/config/index.ts
- Created types at src/types/cert.ts and src/types/api.ts
- Created logger utility at src/utils/logger.ts
- Configured Jest for testing
- Created sample test at tests/sample.test.ts
- Build and tests pass successfully
- Code review fixes applied: removed duplicate files, fixed timing attack vulnerability

### File List

| File | Action | Description |
|------|--------|-------------|
| package.json | UPDATE | Added build, test scripts and dependencies |
| tsconfig.json | UPDATE | Configured for Node.js commonjs |
| jest.config.js | CREATE | Jest testing configuration |
| .env.example | CREATE | Environment variables template |
| src/index.ts | UPDATE | Updated imports for new structure |
| src/config/index.ts | CREATE | Configuration loader |
| src/api/routes/certs.ts | CREATE | Certificate API routes |
| src/api/routes/index.ts | CREATE | Route aggregation |
| src/middleware/auth.ts | CREATE | Authentication middleware |
| src/middleware/error.ts | CREATE | Error handling middleware |
| src/services/storageService.ts | CREATE | Storage service |
| src/services/index.ts | CREATE | Services export |
| src/types/cert.ts | CREATE | Certificate types |
| src/types/api.ts | CREATE | API response types |
| src/types/index.ts | CREATE | Types export |
| src/utils/logger.ts | CREATE | Logger utility |
| src/utils/index.ts | CREATE | Utils export |
| tests/sample.test.ts | CREATE | Sample test |
| storage/clientCerts/ | CREATE | Certificate storage dir |
| storage/metaData/ | CREATE | Metadata storage dir |
| storage/temp/ | CREATE | Temp storage dir |
