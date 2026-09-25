# Application Module Documentation

This document describes the **Application** domain implementation in the JobPholio backend.

## Overview
The `applications` module provides full CRUD operations for job applications, along with domain‑specific sub‑resources:
- **Timeline events** – historical state changes.
- **Notes** – free‑form textual annotations.
- **Files** – metadata for user‑uploaded documents.
- **Interviews** – scheduled interview details.
- **Next step** – the current actionable step for the user.

All resources are **embedded** inside the `Application` Mongoose document to ensure atomic reads/writes and simplify ownership checks.

## Mongoose Schema (`src/modules/applications/application.model.ts`)
- `userId` (ObjectId, indexed) – ownership reference.
- `company` – sub‑document with `name`, `logoUrl`, `website`.
- `job` – sub‑document with `title`, `location`, `employmentType`, `salary`.
- `status` (enum) – current application state.
- `lastStatusChangedAt` – automatically updated on status changes.
- `timeline[]` – array of events (`status`, `note`, `timestamp`).
- `notes[]` – array of note objects (`content`, `createdAt`).
- `files[]` – array of file metadata (`name`, `url`, `mimeType`, `size`, `category`).
- `interviews[]` – array of interview sub‑documents (`round`, `type`, `scheduledAt`, `meetingUrl`).
- `nextStep` – free‑form string indicating the next action.
- Standard `timestamps` (`createdAt`, `updatedAt`).

## Validation (`src/modules/applications/application.schema.ts`)
Zod schemas enforce request payload shape for:
- Create (`POST /applications`)
- Update (`PATCH /applications/:id`)
- Status change (`PATCH /applications/:id/status`)
- Sub‑resource creation (notes, interviews, files).

## Controllers & Services
- **ApplicationService** – encapsulates business logic (status transitions, timeline event creation, ownership checks).
- **ApplicationController** – translates service results into the standardized API response format.

## Routes (`src/modules/applications/application.routes.ts`)
All routes are mounted under `/api/v1/applications` and are protected by the `requireAuth` middleware.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List applications with filtering, sorting, pagination. |
| `POST` | `/` | Create a new application. |
| `GET` | `/:id` | Retrieve a single application. |
| `PATCH` | `/:id` | Update mutable fields. |
| `DELETE` | `/:id` | Delete an application. |
| `PATCH` | `/:id/status` | Change status, append timeline event. |
| `POST` | `/:id/notes` | Add a note. |
| `POST` | `/:id/interviews` | Schedule an interview. |
| `POST` | `/:id/files` | Attach a file metadata record. |

## Ownership & Authorization
Every query includes `userId: req.user.id`. Direct document access without this filter is prohibited, guaranteeing that a user cannot access another user’s applications.

## Testing
Integration tests (`tests/applications.test.ts`) cover all endpoints, validation errors, ownership enforcement, and status‑change side effects (timeline event creation, `lastStatusChangedAt` update).

---
*Generated on 2026-09-15 as part of Phase 6 completion.*
