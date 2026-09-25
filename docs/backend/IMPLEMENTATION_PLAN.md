# JobPholio Master Backend Implementation Plan

## 1. Product Overview & Core Promise
JobPholio is a premium job application tracking SaaS designed under the core promise: **"Every application. One place."**

This document details the step-by-step master implementation plan for building the production backend.

---

## 2. Technical Architecture Summary
- **Language:** TypeScript (Strict Mode)
- **Framework:** Express
- **Database:** MongoDB Atlas via Mongoose ORM
- **Validation:** Zod
- **Auth:** Double Token JWT + Session Refresh Token Revocation
- **Security:** Helmet, CORS, Express Rate Limit, bcrypt
- **Logging:** Pino structured logger
- **Testing:** Vitest + Supertest

---

## 3. Implementation Sequence & Verification Plan

### Phase 2 — Project Configuration & Tooling
- **Tasks:** Install TypeScript (`typescript`, `@types/node`, `@types/express`, `ts-node-dev`), Zod, ESLint, Prettier. Create `tsconfig.json`, `src/config/env.ts` with Zod validation.
- **Verification:** Run `npx tsc --noEmit` to verify zero type errors.

### Phase 3 — Database Foundation
- **Tasks:** Refactor `src/config/database.js` to TypeScript (`src/config/database.ts`). Implement Mongoose connection lifecycle, event hooks, pool configuration, and graceful shutdown handling.
- **Verification:** Test connection failure and success states cleanly.

### Phase 4 — Authentication & Sessions
- **Tasks:** Implement `User`, `AuthIdentity`, and `Session` schemas. Create `AuthService` and `AuthController` for Register, Login, Refresh, Logout, Change Password, and Session Revocation endpoints.
- **Verification:** Integration tests verifying login token issuing, refresh rotation, and session revocation.

### Phase 5 — User Profile & Preferences
- **Tasks:** Build `ProfileService` and `ProfileController`. Implement `GET /api/v1/profile`, `PATCH /api/v1/profile`, and dynamic `GET /api/v1/profile/completion`.
- **Verification:** Test profile update validation and dynamic percentage calculation.

### Phase 6 — Application Core Management & Status Transitions
- **Tasks:** Implement `Application` schema. Create `ApplicationService` for CRUD, status transitions (`applied`, `on_hold`, `interview`, `offer`, `rejected`), auto-updating `lastStatusChangedAt`, appending timeline events, and paginated query filtering.
- **Verification:** Integration tests for application CRUD, status transition domain rules, and query parameters (search, filter, sort, paginate).

### Phase 7 — Application Timeline, Notes & Files
- **Tasks:** Build embedded subdocument operations for application notes (`notes[]`), file metadata (`files[]`), and timeline events (`timeline[]`).
- **Verification:** Unit tests verifying array manipulation atomicity and timeline immutability.

### Phase 8 — Multi-Round Interviews & Derived Calendar
- **Tasks:** Build multi-round interview subdocument CRUD (`interviews[]`). Implement `CalendarService` exposing `GET /api/v1/calendar/events`.
- **Verification:** Test interview creation/modification and verify calendar event output projection.

### Phase 9 — Dashboard & Needs Attention Engine
- **Tasks:** Implement `DashboardService` with MongoDB aggregation pipelines for metrics, recent activity, upcoming interviews, and dynamic `Needs Attention` calculation (`status === 'on_hold'` AND `today - lastStatusChangedAt >= user.applicationTracking.onHoldThresholdDays`).
- **Verification:** Test Needs Attention threshold rules and aggregation accuracy.

### Phase 10 — Notification Engine & Preferences
- **Tasks:** Build `Notification` schema, `NotificationService`, and routes for notification listing, mark read, and mark all read.
- **Verification:** Test notification creation upon status transitions and unread count queries.

### Phase 11 — Reusable User Documents Repository
- **Tasks:** Implement `Document` schema and `DocumentService` for managing reusable master user documents (Resumes, Cover Letters, Portfolios).
- **Verification:** Test default document designation logic and user ownership scoping.

### Phase 12 — Settings, CSV Data Export & Privacy Operations
- **Tasks:** Implement `SettingsService` for account preferences, synchronous CSV application export (`POST /api/v1/applications/export`), data wiping, and account soft deletion.
- **Verification:** Test CSV output formatting, data wipe execution, and account deletion revocation.

### Phase 13 — Analytical Insights
- **Tasks:** Implement `InsightsService` utilizing MongoDB aggregation pipelines for job-search statistics (applications over time, status breakdown, conversion rates, top application sources).
- **Verification:** Test aggregation pipeline performance and multi-month metric calculations.

### Phase 14 — Integrations Foundation
- **Tasks:** Implement `Integration` schema and status management for connected third-party platforms (`linkedin`, `naukri`, `indeed`, `company_sites`, `browser_extension`).
- **Verification:** Test integration status listing and connection toggle stubs.

### Phase 15 — Testing Hardening & Authorization Audit
- **Tasks:** Build complete Vitest + Supertest integration suite. Enforce strict cross-user authorization tests (ensuring User A cannot access or mutate User B's resources).
- **Verification:** Run `npm test` to achieve full test coverage on critical domain paths.

### Phase 16 — API Documentation
- **Tasks:** Finalize and complete `docs/backend/API.md` for all implemented endpoints.
- **Verification:** Ensure 100% parity between code endpoints and documentation specifications.

### Phase 17 — Security Audit & Controls
- **Tasks:** Configure global Helmet headers, strict CORS rules, rate limiting on auth endpoints, and payload size bounds.
- **Verification:** Verify error responses omit sensitive stack traces in production mode.

### Phase 18 — Final Production Readiness Review
- **Tasks:** Verify health check endpoint (`GET /health`), environment validation checks, graceful shutdown signals (`SIGTERM`, `SIGINT`), and production build scripts.
- **Verification:** Execute production build check and final operational audit.
