# JobPholio Architectural Decision Records (ADRs)

This document records the definitive architectural decisions made for the JobPholio backend, explaining the context, options considered, decisions made, and trade-off justifications.

---

## ADR-001 — Modular Monolith Architecture
Adopt a **Modular Monolith** structure in TypeScript under `src/modules/` to ensure clean domain boundaries without microservice operational complexity.

---

## ADR-002 — Decoupled AuthIdentity Model
Extract authentication identities into a separate `AuthIdentity` collection containing `userId`, `provider` ('password' | 'google' | 'apple'), `providerAccountId`, and `passwordHash` (for password auth) to support multi-provider logins cleanly.

---

## ADR-003 — Double Token Strategy with Session-backed Refresh Token Revocation
Use short-lived JWT Access Tokens (15-minute lifespan) paired with long-lived Refresh Tokens stored hashed (`bcrypt`/SHA-256) in a `Session` collection in MongoDB to balance fast stateless requests with instant revocation control.

---

## ADR-004 — Embedded Application Timeline, Notes, Files, and Interviews
Embed `timeline[]`, `notes[]`, `files[]`, and `interviews[]` directly as subdocuments inside `Application` for single-document atomic reads and writes.

---

## ADR-005 — Derived Read-Models (Dashboard, Needs Attention, Insights, Calendar)
Derive all analytical and attention metrics dynamically via MongoDB aggregation pipelines and domain service rules rather than storing static flags that risk state drift.

---

## ADR-006 — Full Migration to TypeScript (Strict Mode)
Migrate the entire backend codebase to TypeScript with strict mode enabled (`"strict": true` in `tsconfig.json`) to enforce compile-time type safety across layers.

---

## ADR-007 — Configurable Environment Module & Port Standardisation
Create a centralized, validated environment configuration module (`src/config/env.ts`) using Zod.

---

## ADR-008 — Resilient Non-Blocking Server Startup with Degraded Health Check Support
Start the Express HTTP server listener immediately upon process bootstrap, trigger `connectDB()` asynchronously in the background, and report DB health via `/health` (returning 503 degraded status if DB is temporarily disconnected).

---

## ADR-009 — Mongoose Base Schema Standards & Test Database Isolation Strategy
Enforce base schema standards (`timestamps: true`, `strict: true`, `toJSONTransformer`) and isolate test environments by connecting tests to an in-memory or `-test` MongoDB database.

---

## ADR-010 — Password Security & Token Rotation Engine Implementation

### Context
Phase 4 requires user registration, password authentication, session management, password change, and token revocation. We must ensure sensitive credentials and refresh tokens are protected against database theft and replay attacks.

### Decision
1. **Password Hashing:** Passwords are hashed using `bcrypt` with cost factor 12. `passwordHash` is stored only on `AuthIdentity` documents with `select: false`.
2. **Refresh Token Hashing:** Plaintext refresh tokens are sent once to the client upon login/refresh and stored in MongoDB only after SHA-256 hashing (`refreshTokenHash`).
3. **Token Rotation:** Reusing an old refresh token fails authentication and invalidates the session.
4. **Password Change Revocation:** Changing passwords invalidates all active sessions for that user across all devices.

### Reasoning & Justification
- Hashing refresh tokens prevents session hijacking even if database backups are leaked.
- Automatic session revocation on password change enforces security best practices.

---

## ADR-011 — Derived Profile Completion Percentage

### Context
Phase 5 requires `GET /api/v1/profile/completion` with a percentage and section breakdown. Storing a static `profileCompletion` field would drift whenever users edit nested profile data or when documents are added later.

### Decision
Compute completion on read from the current `users` document. Four equal sections are used: `personalInfo`, `professionalDetails`, `jobPreferences`, and `hasDefaultDocument`. Until the documents repository exists, `hasDefaultDocument` is always `false`.

### Reasoning & Justification
This matches ADR-005 (derived read-models) and keeps the API honest about incomplete document support without inventing a documents collection early.
