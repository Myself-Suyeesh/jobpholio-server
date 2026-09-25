# JobPholio Backend Documentation

Welcome to the backend architecture and technical documentation for **JobPholio** — a premium job application tracking SaaS.

## Mission Statement
*"Every application. One place."*

JobPholio allows candidates to track every job application, monitor application status history, manage multi-round interviews, store notes and document references, track next action steps, receive timely reminders, and view rich data insights into their job search progress.

---

## Technical Stack

- **Runtime:** Node.js (LTS)
- **Language:** TypeScript (Strict Mode)
- **Framework:** Express
- **Database:** MongoDB Atlas + Mongoose ORM
- **Validation:** Zod
- **Authentication:** JWT (Short-lived Access Tokens) + Hashed Refresh Tokens (Session Collection)
- **Security:** Helmet, CORS, Express Rate Limit, bcrypt password hashing
- **Logging:** Pino structured logging
- **Testing:** Vitest / Jest + Supertest

---

## Documentation Structure

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Modular monolith system architecture, request flow, and service boundaries.
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — Master implementation plan, MVP boundaries, roadmap, and phase breakdown.
- [`DATABASE.md`](./DATABASE.md) — Complete MongoDB schema reference, embedding strategy, indexing, and query patterns.
- [`PROGRESS.md`](./PROGRESS.md) — Living progress tracker for backend implementation phases.
- [`DECISIONS.md`](./DECISIONS.md) — Architectural Decision Records (ADRs).
- [`API.md`](./API.md) — Comprehensive API endpoint reference *(to be populated as endpoints are built)*.
- [`AUTHENTICATION.md`](./AUTHENTICATION.md) — Security & authentication design *(Phase 4)*.
- [`SECURITY.md`](./SECURITY.md) — Security guidelines & controls *(Phase 17)*.
- [`TESTING.md`](./TESTING.md) — Test strategy and coverage requirements *(Phase 15)*.

---

## Getting Started

*(Refer to [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for full project lifecycle details).*
