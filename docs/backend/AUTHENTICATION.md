# JobPholio Authentication & Session Documentation

## 1. Authentication Architecture Overview

JobPholio implements a **Double Token Strategy** (Short-lived JWT Access Tokens + Session-backed Refresh Tokens) decoupled through a multi-identity authentication model (`AuthIdentity`).

```
+-------------------------------------------------------------------------------+
|                             AUTHENTICATION ENGINE                             |
|                                                                               |
|  Client (Web / Mobile)                                                        |
|    ├── Access Token (JWT, 15m) ------------> req.user (Stateless Verification)|
|    └── Refresh Token (Hex String) ---------> Session Collection (MongoDB)     |
|                                                     │                         |
|                                                     ├── refreshTokenHash (SHA) |
|                                                     ├── expiresAt (30d TTL)   |
|                                                     └── revokedAt (Revocation)|
+-------------------------------------------------------------------------------+
```

---

## 2. Token Specification & Security Controls

### Access Token (JWT)
- **Lifespan:** 15 minutes (`JWT_EXPIRES_IN=15m`).
- **Signature Algorithm:** HS256 signed with `JWT_SECRET` (min 32 chars).
- **Claims:** `{ userId, email, name }`.
- **Transmission:** `Authorization: Bearer <access_token>` header.

### Refresh Token (Hashed Session)
- **Lifespan:** 30 days (`REFRESH_TOKEN_EXPIRES_IN_DAYS=30`).
- **Generation:** Cryptographically secure 64-character random hex string (`generateRandomToken()`).
- **Storage:** Stored in MongoDB `sessions` collection hashed with SHA-256 (`hashToken()`). Plaintext refresh tokens are NEVER stored in the database.
- **Automatic Cleanup:** MongoDB TTL index on `expiresAt` automatically drops expired session records.

### Token Rotation Strategy
- When `POST /api/v1/auth/refresh` is called:
  1. The provided refresh token is hashed and matched against active non-revoked sessions.
  2. The old session is immediately marked as revoked (`revokedAt = new Date()`).
  3. A brand new rotated refresh token and session document are created.
  4. Attempting to replay an old/revoked refresh token fails with HTTP 401 Unauthorized.

---

## 3. AuthIdentity Decoupling Model

Rather than storing `passwordHash` or provider flags directly on the `User` profile document, login identities are decoupled into `AuthIdentity` documents (`provider`: `'password'`, `'google'`, `'apple'`):

```typescript
AuthIdentity {
  userId: ObjectId,
  provider: 'password' | 'google' | 'apple',
  providerAccountId: string, // normalized email or provider sub
  passwordHash?: string      // select: false
}
```

- **Security Advantage:** Prevents accidental leakage of `passwordHash` during general user profile database queries or API responses.
- **Multi-Login Capability:** Users can cleanly connect multiple authentication providers to a single `User` account.

---

## 4. Implemented API Endpoints

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | Public | Register new user account with email & password |
| `/api/v1/auth/login` | `POST` | Public | Authenticate email/password & issue tokens |
| `/api/v1/auth/refresh` | `POST` | Public | Rotate refresh token & issue new access token |
| `/api/v1/auth/logout` | `POST` | Public | Revoke active session |
| `/api/v1/auth/me` | `GET` | Bearer | Retrieve authenticated user profile |
| `/api/v1/auth/change-password` | `POST` | Bearer | Update password & revoke all active sessions |
| `/api/v1/auth/identities` | `GET` | Bearer | List connected login identity providers |
| `/api/v1/sessions` | `GET` | Bearer | List active sessions (device, browser, IP, lastUsedAt) |
| `/api/v1/sessions/:id` | `DELETE` | Bearer | Revoke specific session by ID |
| `/api/v1/sessions/all` | `DELETE` | Bearer | Revoke all active sessions for current user |

---

## 5. OAuth Provider Status Notice

- **Password Authentication:** 100% Implemented & Tested.
- **Google & Apple OAuth:** Foundation data model (`AuthIdentity`, `provider: 'google' | 'apple'`) is fully implemented. Live OAuth 2.0 authorization handlers are marked as **PENDING** until client IDs and client secrets are provided in environment configuration. Fake/mock OAuth flows are explicitly prohibited.
