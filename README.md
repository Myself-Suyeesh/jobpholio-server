# Jobpholio — Server

Backend API for **Jobpholio**, a job application tracker that helps candidates keep every application — auto-captured or manually logged — in one place.

This repo contains the REST API only. Frontend lives in a separate repo.

## Tech stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB
- **Auth:** Session-based authentication, sessions stored in MongoDB via `connect-mongo` (not JWT — avoids XSS-related token theft from `localStorage`)
- **Architecture:** Monolith (Phase 1) — kept intentionally simple; no microservices split until there's an actual scaling or team-boundary reason for one

## Prerequisites

- Node.js (LTS)
- MongoDB instance (local or Atlas)
- npm

## Getting started

```bash
git clone <repo-url>
cd Jobpholio-server
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

## Environment variables

| Variable         | Description                                 |
| ---------------- | ------------------------------------------- |
| `PORT`           | Port the server runs on                     |
| `MONGODB_URI`    | MongoDB connection string                   |
| `SESSION_SECRET` | Secret used to sign the session cookie      |
| `NODE_ENV`       | `development` / `production`                |
| `CLIENT_URL`     | Frontend origin, for CORS + cookie settings |

## Project structure

```
src/
  config/        # DB connection, session/store config
  models/        # Mongoose schemas (User, JobApplication)
  routes/        # Express route definitions
  controllers/   # Request handlers / business logic
  middleware/    # Auth guards, error handling
  utils/
server.js        # App entry point
```

## Data model (high level)

- **User** — account/auth details
- **JobApplication** — belongs to a user via a unidirectional `userId` reference (no back-reference on User, to avoid redundant/inconsistent data); tracks company, role, source (LinkedIn/Naukri/manual/etc.), status (applied / on hold / interview / offer / rejected), applied date, notes, and status history

## Auth model

- Session-based: on login, a session is created and stored in MongoDB via `connect-mongo`; the client holds only a session cookie.
- Each authenticated request is validated against the session store — no in-memory session state, so the server can restart or scale horizontally without losing sessions.
- Protected routes require an active session; public routes (signup, login) do not.

## API overview

Full endpoint reference lives in [`API.md`](./API.md) _(add this once endpoint design is finalized)_. Broadly:

- `POST /api/auth/*` — signup, login, logout
- `GET|POST /api/applications` — list / create applications
- `GET|PATCH|DELETE /api/applications/:id` — fetch, update, delete a single application

## Scripts

| Command       | Description                                    |
| ------------- | ---------------------------------------------- |
| `npm run dev` | Start server in development mode (with reload) |
| `npm start`   | Start server in production mode                |
| `npm test`    | Run tests _(add once test setup exists)_       |

## Roadmap

- **Phase 1 (current):** Auth + manual CRUD for job applications
- **Phase 2:** AI features — resume-to-JD matching, JD parsing via LLM
- **Phase 3:** Email parsing (Gmail) + browser extension endpoints for auto-capturing applications

## Status

Early development — API endpoint structure being finalized.
