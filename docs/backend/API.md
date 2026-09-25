# JobPholio API Endpoint Specifications & Data Contracts (`/api/v1`)

## 1. Global API Standards

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Authentication Header:** `Authorization: Bearer <access_token>`

### Standard Success Response Payload
```json
{
  "success": true,
  "data": {}
}
```

### Standard Paginated Response Payload
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Standard Error Response Payload
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error",
    "details": []
  }
}
```

---

## 2. Authentication & Sessions (`/api/v1/auth`, `/api/v1/sessions`)

### `POST /api/v1/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "650000000000000000000001",
        "name": "Alex Johnson",
        "email": "alex@example.com"
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "7f8b..."
      }
    }
  }
  ```

### `POST /api/v1/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):** Standard user + tokens payload.

### `POST /api/v1/auth/refresh`
- **Auth:** Public (requires refresh token)
- **Request Body:**
  ```json
  {
    "refreshToken": "7f8b..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "new_rotated_7f8b..."
    }
  }
  ```

### `POST /api/v1/auth/logout`
- **Auth:** Authenticated
- **Request Body:** `{ "refreshToken": "7f8b..." }`
- **Response (200 OK):** `{ "success": true, "data": { "message": "Logged out successfully" } }`

### `GET /api/v1/auth/me`
- **Auth:** Authenticated
- **Response (200 OK):** Authenticated user profile summary.

### `GET /api/v1/sessions`
- **Auth:** Authenticated
- **Response (200 OK):** Array of active sessions for the user (device, browser, IP, lastUsedAt).

### `DELETE /api/v1/sessions/:id`
- **Auth:** Authenticated
- **Response (200 OK):** Revokes specific session.

### `DELETE /api/v1/sessions/all`
- **Auth:** Authenticated
- **Response (200 OK):** Revokes all active sessions except current.

---

## 3. User & Profile (`/api/v1/profile`)

### `GET /api/v1/profile`
- **Auth:** Authenticated
- **Response (200 OK):** `{ "success": true, "data": { "user": { ...complete user document } } }`

### `PATCH /api/v1/profile`
- **Auth:** Authenticated
- **Request Body:** Partial nested updates for `identity`, `profile`, `professional`, and `jobPreferences`. Unspecified nested fields are left unchanged. Appearance, notification preferences, and tracking thresholds remain Settings (Phase 12).
- **Response (200 OK):** `{ "success": true, "data": { "user": { ... } } }`

### `GET /api/v1/profile/completion`
- **Auth:** Authenticated
- **Calculation:** Four equal sections (25% each). `personalInfo` requires name, email, phone, and location. `professionalDetails` requires headline and at least one skill. `jobPreferences` requires at least one role, location, and work type. `hasDefaultDocument` stays `false` until reusable documents (Phase 11) exist.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "percentage": 75,
      "breakdown": {
        "personalInfo": true,
        "professionalDetails": true,
        "jobPreferences": true,
        "hasDefaultDocument": false
      }
    }
  }
  ```

---

## 4. Applications (`/api/v1/applications`)

### `GET /api/v1/applications`
- **Auth:** Authenticated
- **Query Parameters:** `search`, `status`, `source`, `location`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`, `page`, `limit`
- **Response (200 OK):** Paginated array of applications.

### `POST /api/v1/applications`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "company": {
      "name": "Stripe",
      "logoUrl": "https://logo.com/stripe.png",
      "website": "https://stripe.com"
    },
    "job": {
      "title": "Senior Backend Engineer",
      "location": "San Francisco, CA",
      "employmentType": "full_time",
      "salary": { "min": 180000, "max": 220000, "currency": "USD" }
    },
    "source": "linkedin",
    "status": "applied",
    "dateApplied": "2026-09-15T00:00:00.000Z"
  }
  ```
- **Response (201 Created):** Created Application object (includes generated initial `timeline` event).

### `GET /api/v1/applications/:id`
- **Auth:** Authenticated
- **Response (200 OK):** Full Application object.

### `PATCH /api/v1/applications/:id`
- **Auth:** Authenticated
- **Response (200 OK):** Updated application object.

### `DELETE /api/v1/applications/:id`
- **Auth:** Authenticated
- **Response (200 OK):** Deletes specified application.

### `PATCH /api/v1/applications/:id/status`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "status": "interview",
    "note": "Scheduled technical screening round."
  }
  ```
- **Response (200 OK):** Updates status, updates `lastStatusChangedAt`, appends `timeline` event, and returns application.

---

## 5. Notes, Files & Interviews Subdocuments

### `POST /api/v1/applications/:id/notes`
- **Auth:** Authenticated
- **Request Body:** `{ "content": "Preparing for system design interview." }`

### `POST /api/v1/applications/:id/interviews`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "round": "Technical Round 1",
    "type": "technical",
    "scheduledAt": "2026-09-20T15:00:00.000Z",
    "meetingUrl": "https://meet.google.com/abc-defg-hij"
  }
  ```

### `POST /api/v1/applications/:id/files`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "name": "Stripe_Custom_Resume.pdf",
    "url": "https://storage.provider.com/resumes/123.pdf",
    "mimeType": "application/pdf",
    "size": 245000,
    "category": "resume"
  }
  ```

---

## 6. Read-Models: Dashboard, Calendar & Insights

### `GET /api/v1/dashboard`
- **Auth:** Authenticated (`Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "totalApplications": 42,
        "activeApplications": 12,
        "interviewsScheduled": 3,
        "onHold": 2,
        "needsAttentionCount": 1
      },
      "recentApplications": [],
      "needsAttentionApplications": [],
      "upcomingInterviews": []
    }
  }
  ```

### `GET /api/v1/calendar/events`
- **Auth:** Authenticated (`Bearer <token>`)
- **Query Parameters:**
  - `start` *(optional, ISO 8601 string)* — Filter interviews scheduled on or after this date.
  - `end` *(optional, ISO 8601 string)* — Filter interviews scheduled on or before this date.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60d5ecb8b5c9c22b8c8d1e2f",
        "applicationId": "60d5ecb8b5c9c22b8c8d1e20",
        "company": "Google",
        "position": "Senior Software Engineer",
        "round": "Technical Round 1",
        "type": "technical",
        "scheduledAt": "2026-10-01T10:00:00.000Z",
        "endAt": "2026-10-01T11:00:00.000Z",
        "timezone": "UTC",
        "interviewer": "Engineering Lead",
        "meetingUrl": "https://meet.google.com/xyz-abc-def",
        "status": "scheduled",
        "notes": "System Architecture discussion"
      }
    ]
  }
  ```

### `GET /api/v1/insights`
- **Auth:** Authenticated
- **Response (200 OK):** Aggregated analytics (conversion rates, application timeline charts, top sources).

---

## 7. Documents (`/api/v1/documents`)

### `GET /api/v1/documents`
- **Auth:** Authenticated
- **Response (200 OK):** Array of reusable user documents.

### `POST /api/v1/documents`
- **Auth:** Authenticated
- **Response (201 Created):** Document metadata record.

---

## 8. Notifications (`/api/v1/notifications`)

### `GET /api/v1/notifications`
- **Auth:** Authenticated
- **Response (200 OK):** Array of user notifications.

### `PATCH /api/v1/notifications/:id/read`
- **Auth:** Authenticated
- **Response (200 OK):** Marks notification as read.

### `PATCH /api/v1/notifications/read-all`
- **Auth:** Authenticated
- **Response (200 OK):** Marks all notifications as read.

---

## 9. Settings, Export & Data Privacy (`/api/v1/settings`)

### `GET /api/v1/settings`
- **Auth:** Authenticated
- **Response (200 OK):** Combined settings object (appearance, notification preferences, tracking thresholds).

### `PATCH /api/v1/settings`
- **Auth:** Authenticated
- **Response (200 OK):** Updated settings.

### `POST /api/v1/applications/export`
- **Auth:** Authenticated
- **Response (200 OK):** File download (`text/csv` or JSON payload with CSV content).

### `DELETE /api/v1/settings/data`
- **Auth:** Authenticated
- **Response (200 OK):** Deletes all job applications, documents, and notifications for the user.

### `DELETE /api/v1/settings/account`
- **Auth:** Authenticated
- **Response (200 OK):** Soft deletes user account and revokes all active sessions.
