# JobPholio Database Model & MongoDB Infrastructure Documentation

## 1. MongoDB Architecture & Connection Strategy

The JobPholio backend connects to **MongoDB Atlas** using Mongoose ORM (`^9.9.2`).

### Connection Lifecycle & Management
- **Single Connection Reuse:** Connection is initialized once at application startup in `src/config/database.ts` and reused across request threads.
- **URI Validation:** Connection strings are validated via Zod in `src/config/env.ts`.
- **Sanitized Logging:** Connection target strings logged via Pino automatically redact username/password credentials (`sanitizeMongoUri`).
- **Resilient Degradation:** If MongoDB Atlas is temporarily unreachable at server startup, the server logs a warning and enters a degraded mode without crashing HTTP listener bootstrap.

---

## 2. Test Database Strategy (Test Isolation)

To prevent automated unit and integration tests from corrupting development or production data:
- `getEffectiveMongoUri()` automatically detects `NODE_ENV === 'test'`.
- In test environments, Mongoose connects to `MONGODB_TEST_URI` (or automatically appends `-test` to the database name path if `MONGODB_TEST_URI` is unspecified).
- Test runs execute against isolated databases and drop temporary test collections upon completion.

---

## 3. Mongoose Configuration & Schema Standards

### Implemented Foundation Standard (`src/shared/database/base.schema.ts`)
1. **Timestamps:** Every schema enforces `timestamps: true` (`createdAt: Date`, `updatedAt: Date`).
2. **Strict Schema Enforcement:** `strict: true` prevents unvalidated extra fields from persisting in MongoDB.
3. **JSON Serialization Transformer (`toJSONTransformer`):**
   - Automatically converts MongoDB internal `_id` to virtual `id` string.
   - Automatically strips internal version key `__v`.
   - Prevents leaking internal database flags in public API responses.
4. **ObjectId & Reference Standard:** All entity references use `Schema.Types.ObjectId` with `ref: 'ModelName'`.

---

## 4. Entity Ownership & Scoping Model

Every user-owned resource MUST contain an indexed reference to the owning user (`userId: Schema.Types.ObjectId`):

```
[ User ] (Primary Tenant Entity)
   ├── AuthIdentities (userId)
   ├── Sessions (userId)
   ├── Applications (userId)
   ├── Documents (userId)
   ├── Notifications (userId)
   └── Integrations (userId)
```

- **Authorization Rule:** Services MUST filter by `userId` on every query (`Model.findOne({ _id: resourceId, userId: req.user.id })`).
- **Security Boundary:** Frontend filtering is never trusted for ownership authorization.

---

## 5. Implementation Status Matrix

### IMPLEMENTED Collections (Phases 4–9)
- **`users`** — User profile, preferences, and tracking threshold settings.
- **`auth_identities`** — Decoupled login credentials (`password`, `google`, `apple`).
- **`sessions`** — Refresh tokens with TTL expiration index and revocation timestamps.
- **`applications`** — Core applications with embedded `company`, `job`, `nextStep`, `interviews[]`, `notes[]`, `files[]`, and `timeline[]`.

### PLANNED Collections (Scheduled for Phase 10–14)
- **`documents`** (Phase 11) — Master reusable user documents.
- **`notifications`** (Phase 10) — In-app alerts.
- **`integrations`** (Phase 14) — Connection status for third-party tools.

---

## 6. Indexing Strategy Summary

| Collection | Implemented Index | Purpose |
| :--- | :--- | :--- |
| `users` | `identity.email` (Unique) | User login lookup |
| `auth_identities` | `(userId, provider)` (Unique), `(provider, providerAccountId)` (Unique) | Login identity resolution |
| `sessions` | `(userId, revokedAt)`, `refreshTokenHash` (Unique), `expiresAt` (TTL) | Session validation & auto-cleanup |
| `applications` | `(userId, status)`, `(userId, dateApplied)`, `(userId, lastStatusChangedAt)`, `(userId, status, lastStatusChangedAt)`, `(userId, interviews.scheduledAt)`, `(userId, source)` | Dashboard, calendar & list query performance |
| `documents` | `(userId, category)` *(Planned)* | Document categorization |
| `notifications` | `(userId, readAt, createdAt)` *(Planned)* | Unread notification counts |
| `integrations` | `(userId, provider)` (Unique) *(Planned)* | Third-party connection status |

---

## 7. Graceful Shutdown & Health Monitoring

- `disconnectDB()` cleanly closes Mongoose connections during `SIGINT` or `SIGTERM` signals.
- `GET /health` returns HTTP 200 (`status: "ok"`) when database is connected, and HTTP 503 (`status: "degraded"`) when database is disconnected.
