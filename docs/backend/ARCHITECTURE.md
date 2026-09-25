# JobPholio Backend Architecture & Technical Blueprint

## 1. Executive Architectural Overview

JobPholio is engineered as a **Modular Monolith** in **TypeScript (Strict Mode)** running on **Node.js** with **Express** and **MongoDB Atlas** (Mongoose ORM).

---

## 2. Request Lifecycle & Layer Positioning

```
HTTP Request (Client)
      │
      ▼
Express Router (/api/v1/*)
      │
      ▼
Middlewares (Security, Rate Limit, Auth JWT, Zod Validation)
      │
      ▼
Controller (Thin: Request extraction & HTTP response formatting)
      │
      ▼
Service (Thick: Business logic, domain invariants & ownership check)
      │
      ▼
Mongoose Model & Schemas (Data access & schema validation)
      │
      ▼
MongoDB Atlas (Database Persistence)
```

### Why Layer Separation Matters
- **Thin Controllers:** Controllers only receive the request, delegate to the domain Service, and format HTTP responses. Controllers contain zero business logic.
- **Thick Services:** Domain Services contain all business rules, status transition rules, calculation logic, and authorization scoping (`userId`). This makes business logic 100% testable independently of HTTP frameworks.
- **Clean Models:** Mongoose Models focus strictly on data persistence, index declarations, schema constraints, and serialization transformers. Business rules are not hidden inside Mongoose hooks or model methods to avoid magic side-effects.

---

## 3. Directory Structure

```
jobpholio-server/
├── docs/
│   └── backend/
│       ├── README.md
│       ├── ARCHITECTURE.md
│       ├── DATABASE.md
│       ├── API.md
│       ├── IMPLEMENTATION_PLAN.md
│       ├── PROGRESS.md
│       ├── DECISIONS.md
│       ├── CHANGELOG.md
│       └── ...
├── src/
│   ├── app.ts                 # Express app initialization & global middleware assembly
│   ├── server.ts              # HTTP server listener, DB connection trigger & graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Validated environment configuration schema (Zod)
│   │   ├── database.ts        # Mongoose connection manager & health reporting
│   │   └── logger.ts          # Pino structured logging instance
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authentication & session revocation validator
│   │   ├── error.middleware.ts      # Global centralized error handling middleware
│   │   ├── validation.middleware.ts # Zod request validation wrapper
│   │   └── rate-limit.middleware.ts # IP rate limiting configurations
│   ├── modules/               # Domain business modules
│   ├── routes/
│   │   └── index.ts           # Central Express router mounting /api/v1 endpoints
│   └── shared/
│       ├── database/          # Mongoose base schema options & serialization transformers
│       ├── errors/            # Custom AppError class hierarchy
│       ├── constants/         # Enums, valid statuses, error codes
│       ├── types/             # Shared TypeScript interfaces
│       └── utils/             # Helper functions
├── tests/
│   ├── database.test.ts       # Database infrastructure & serialization tests
│   ├── health.test.ts         # Health check & ping integration tests
│   └── setup.ts               # Test suite setup
├── .env                       # Local environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies & scripts
├── tsconfig.json              # Strict TypeScript configuration
└── vitest.config.ts           # Test runner configuration
```

---

## 4. Module Boundaries & Data Ownership

| Module | Core Responsibilities | Persistence Target |
| :--- | :--- | :--- |
| **`auth`** | User registration, password verification, JWT issuing, refresh token rotation, session revocation, `AuthIdentity` management. | `users`, `auth_identities`, `sessions` |
| **`users`** | Core user entity retrieval, email normalization, account modification, account soft deletion. | `users` |
| **`profile`** | User personal info, professional experience, job search preferences, dynamic profile completion calculation. | `users` |
| **`applications`** | Application CRUD, status transitions, timeline event generation, embedded notes, files metadata, multi-round interviews, search/filter/pagination. | `applications` |
| **`documents`** | Reusable user-level documents repository. | `documents` |
| **`dashboard`** | Aggregated read-model service (metrics, activity, upcoming interviews, needs-attention). | Derived over `applications` |
| **`calendar`** | Projection of interview subdocuments into normalized calendar events. | Derived over `applications` |
| **`insights`** | Aggregation pipelines calculating job-search statistics. | Derived over `applications` |
| **`notifications`** | Notification creation, retrieval, mark-as-read, preference checks. | `notifications` |
| **`integrations`** | Foundation tracking for connected third-party platforms. | `integrations` |
| **`settings`** | Appearance settings, notification preferences, tracking threshold, CSV export, data wiping. | `users`, `applications` |
