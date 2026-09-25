# JobPholio Backend Changelog

All notable changes to the JobPholio backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Phase 9: Dashboard & Needs Attention Engine (2026-09-24)

### Added
- Dashboard module (`src/modules/dashboard/`) with `DashboardService`, `DashboardController`, and `GET /api/v1/dashboard` endpoint.
- Derived read-model analytics aggregating real-time metrics (`totalApplications`, `activeApplications`, `interviewsScheduled`, `onHold`, `needsAttentionCount`, `interviewRate`, `offerRate`), `applicationsByStatus` counts breakdown, recent applications list, recent activity stream, upcoming interviews, and needs-attention alerts.
- Dynamic Needs Attention engine computing `status === 'on_hold'` AND `elapsedDays >= user.applicationTracking.onHoldThresholdDays` (default 14 days) without mutating database schemas or creating separate collections.
- Compound performance indexes on `ApplicationSchema` for `{ userId: 1, status: 1, lastStatusChangedAt: -1 }` and `{ userId: 1, 'interviews.scheduledAt': 1 }`.
- Comprehensive integration test suite (`tests/dashboard.test.ts`) verifying auth protection, cross-user isolation, status breakdowns, threshold calculations, custom threshold rules, and empty dashboard states.
- Recorded ADR-012 in `docs/backend/DECISIONS.md`.

---

## [Unreleased] - Phase 8: Multi-Round Interviews & Calendar (2026-09-24)

### Added
- Calendar module (`src/modules/calendar/`) with `CalendarService`, `CalendarController`, Zod query schema, and `GET /api/v1/calendar/events` endpoint.
- Normalized calendar events output projected from embedded application interviews with date range filtering (`start`, `end`).
- Integration test suite (`tests/calendar.test.ts`) covering authorization, user data isolation, normalized event formatting, and date filtering.

---

## [Unreleased] - Phase 5: User Profile & Preferences (2026-09-15)

### Added
- Profile module (`src/modules/profile/`) with `ProfileService`, `ProfileController`, Zod update schema, and authenticated routes.
- `GET /api/v1/profile` returning the full authenticated user document.
- `PATCH /api/v1/profile` applying partial nested updates to `identity`, `profile`, `professional`, and `jobPreferences` without wiping unspecified defaults.
- `GET /api/v1/profile/completion` deriving a four-section completion percentage (`personalInfo`, `professionalDetails`, `jobPreferences`, `hasDefaultDocument`).
- Profile integration tests (`tests/profile.test.ts`) covering auth protection, validation, partial updates, duplicate email conflicts, email/login sync, and completion recalculation.
- Recorded ADR-011 in `docs/backend/DECISIONS.md`.

### Changed
- Mounted `/api/v1/profile` in `src/routes/index.ts`.
- Updating `identity.email` keeps the password `AuthIdentity.providerAccountId` in sync so login continues to work.

---

## [Unreleased] - Phase 6: Application Core Management (2026-09-15)

### Added
- Application module (`src/modules/applications/`) with Mongoose schema, service, controller, and routes.
- CRUD endpoints for applications, status changes, notes, interviews, and file metadata.
- Embedded subdocuments for timeline, notes, files, and interviews per ADR-004.
- Ownership enforcement via `userId` filtering in all queries.
- Comprehensive integration tests (`tests/applications.test.ts`) covering all endpoints, validation, ownership, and status‑change side effects.
- Updated API documentation (`docs/backend/API.md`) with Application endpoints.
- Recorded ADR-004 and ADR-005 references.

---

## Phase 4: Authentication & Sessions (2026-09-15)

### Added
- User Mongoose model (`src/modules/users/user.model.ts`).
- AuthIdentity Mongoose model (`src/modules/auth/auth-identity.model.ts`) storing decoupled login methods (`password`, `google`, `apple`) and `passwordHash` (`select: false`).
- Session Mongoose model (`src/modules/auth/session.model.ts`) storing hashed refresh tokens, device info, IP address, user agent, expiration (TTL index), and revocation status (`revokedAt`).
- Crypto & Password helper utilities (`src/shared/utils/crypto.ts`) implementing `bcrypt` password hashing (salt 12) and SHA-256 token hashing.
- JWT utility module (`src/modules/auth/jwt.utils.ts`) for Access Token signing (15m) and verification.
- Auth Request Zod validation schemas (`src/modules/auth/auth.schema.ts`) for register, login, refresh token, and password change.
- Authentication Middleware (`src/middleware/auth.middleware.ts`) enforcing Bearer JWT authorization and attaching `req.user`.
- `AuthService` (`src/modules/auth/auth.service.ts`) implementing user registration, credential authentication, refresh token rotation, logout, password change, active sessions retrieval, and session revocation.
- `AuthController` (`src/modules/auth/auth.controller.ts`) formatting standardized JSON API responses.
- Express router modules for authentication (`src/modules/auth/auth.routes.ts`) and active session management (`src/modules/auth/sessions.routes.ts`).
- Comprehensive Vitest & Supertest integration suite (`tests/auth.test.ts`) using `mongodb-memory-server` testing all authentication success & failure cases.
- Dedicated authentication architecture documentation (`docs/backend/AUTHENTICATION.md`) and recorded ADR-010 in `docs/backend/DECISIONS.md`.

### Changed
- Mounted `/api/v1/auth` and `/api/v1/sessions` routes in `src/routes/index.ts`.
- Updated rate limiter middleware (`src/middleware/rate-limit.middleware.ts`) to bypass limits in test mode.

### Security
- Passwords are strictly hashed with bcrypt (cost factor 12) before persistence.
- `passwordHash` is excluded by default on Mongoose queries (`select: false`) and omitted from JSON output.
- Refresh tokens are hashed via SHA-256 before storage in MongoDB.
- Changing passwords automatically revokes all active sessions for that user across all devices.

---

## Phase 3: Database Foundation (2026-09-15)

### Added
- Base schema options and serialization transformers (`src/shared/database/base.schema.ts`) enforcing `timestamps: true`, `strict: true`, and `toJSONTransformer` (`_id` to `id` string conversion, `__v` version stripping).
- Sanitized URI logging utility (`sanitizeMongoUri`) in `src/config/database.ts` redacting password credentials from connection log output.
- Database health check accessor (`getDatabaseHealth()`) in `src/config/database.ts` returning connection status, readyState, sanitized host, and database name.
- Test URI isolation helper (`getEffectiveMongoUri()`) in `src/config/env.ts` appending `-test` to the MongoDB database URI when running in test environment (`NODE_ENV === 'test'`).
- Automated database infrastructure test suite (`tests/database.test.ts`) covering URI sanitization, test URI isolation, database health status, `toJSONTransformer`, and base schema plugins.
- Documented ADR-009 in `docs/backend/DECISIONS.md`.

### Changed
- Refactored `GET /health` endpoint in `src/routes/index.ts` to consume `getDatabaseHealth()`.
- Updated `docs/backend/DATABASE.md` and `docs/backend/ARCHITECTURE.md` to document database foundation, serialization standards, test isolation strategy, and request lifecycle layering.

---

## Phase 2: Project Configuration & Backend Foundation (2026-09-15)

### Added
- TypeScript infrastructure (`tsconfig.json`, `tsc`, `ts-node-dev`).
- Validated environment module (`src/config/env.ts`) using Zod.
- Structured Pino logger (`src/config/logger.ts`) with development pretty-printing and header redaction.
- Robust Mongoose connection manager (`src/config/database.ts`) supporting connection pooling, event logging, and graceful degradation.
- Typed `AppError` class hierarchy (`src/shared/errors/app.error.ts`) covering `BadRequestError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, and `InternalServerError`.
- Global Express error middleware (`src/middleware/error.middleware.ts`) handling Zod errors, typed AppErrors, and 500 fallbacks without exposing stack traces in production.
- Zod request validation wrapper middleware (`src/middleware/validation.middleware.ts`).
- Rate limiting middleware foundation (`src/middleware/rate-limit.middleware.ts`) providing global (100 req/15 min) and auth-specific (10 req/15 min) limiters via `express-rate-limit`.
- Security middlewares: `helmet` for secure HTTP headers, `cors` configured with `CORS_ORIGIN` whitelist, body parsers (`express.json()`).
- API router versioning foundation (`src/routes/index.ts`) mounting `/api/v1` and health check `/health`.
- Express application factory (`src/app.ts`) assembling security, rate limiters, routes, and error middleware.
- Server bootstrap (`src/server.ts`) with asynchronous DB connection trigger and graceful shutdown handling (`SIGTERM`, `SIGINT`).
- Vitest configuration (`vitest.config.ts`) and health endpoint integration test suite (`tests/health.test.ts`).
- Template `.env.example` file.

### Changed
- Refactored server entry point from legacy JavaScript (`src/app.js`) to modular TypeScript (`src/server.ts`).
- Upgraded package scripts in `package.json` for `dev`, `build`, `start`, `typecheck`, and `test`.

### Security
- Added HTTP security headers using Helmet.
- Added strict origin matching CORS middleware.
- Added IP rate limiting middleware.
- Redacted sensitive header keys (auth, token, cookies) in structured logger.
