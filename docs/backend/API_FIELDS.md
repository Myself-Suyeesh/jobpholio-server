# JobPholio Backend API Field Specifications & Request/Response Contracts

This document is the authoritative, field-level reference guide for frontend developers building forms, UI controls, and API integration layers for the JobPholio SaaS platform.

It details every path parameter, query parameter, request body field, validation rule, default value, and enumeration used across all `/api/v1` backend endpoints.

---

## 1. Field Classification Legend

Every field accepted by or returned from the backend is classified into one of the following categories:

| Classification | Meaning |
| :--- | :--- |
| **REQUIRED** | The frontend **MUST** provide this field in the request payload. Omission triggers HTTP `400 Bad Request` (Validation Error). |
| **OPTIONAL** | The field may be omitted. If omitted, the server uses a default value or leaves the property undefined. |
| **OPTIONAL + NULLABLE** | The field is optional and explicitly permits `null` as a valid input to clear or reset the field. |
| **SYSTEM GENERATED** | Created exclusively by the backend (e.g. `id`, `createdAt`, `updatedAt`). **Do NOT send in requests.** |
| **SERVER DERIVED** | Calculated dynamically on read (e.g. `daysOnHold`, `completion.percentage`, `metrics`). **Do NOT send in requests.** |
| **NOT APPLICABLE** | The route does not accept path, query, or body parameters. |

---

## 2. Consolidated Enumerations

The following enumerations are enforced by Zod validation schemas and Mongoose database models:

### Application Status (`ApplicationStatus`)
Used in: `POST /applications`, `PATCH /applications/:id`, `PATCH /applications/:id/status`, `GET /applications` (query filter), `GET /dashboard`.

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `applied` | Applied | Initial state when a job application has been submitted. *(Default)* |
| `on_hold` | On Hold | Candidate or company has paused the process. Triggers Needs Attention alerts if threshold exceeded. |
| `interview` | Interviewing | Active interviewing stage (screening, technical, behavioral, HR). |
| `offer` | Offer Received | Formal job offer has been extended. |
| `rejected` | Rejected | Application was not successful or candidate withdrew. |

### Application Source (`ApplicationSource`)
Used in: `POST /applications`, `PATCH /applications/:id`, `GET /applications` (query filter).

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `linkedin` | LinkedIn | Sourced via LinkedIn job board or networking. |
| `naukri` | Naukri | Sourced via Naukri platform. |
| `indeed` | Indeed | Sourced via Indeed job search. |
| `company_site` | Company Career Page | Applied directly on company website. |
| `manual` | Manual / Direct | Manually created entry by user. *(Default)* |
| `other` | Other | Other job boards, referrals, or agencies. |

### Employment Type (`EmploymentType`)
Used in: `POST /applications`, `PATCH /applications/:id`.

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `full_time` | Full-Time | Permanent full-time position. |
| `part_time` | Part-Time | Part-time engagement. |
| `contract` | Contract | Independent contractor or consultancy agreement. |
| `internship` | Internship | Student or graduate internship role. |

### Interview Type (`InterviewType`)
Used in: `POST /applications/:id/interviews`, `PATCH /applications/:id/interviews/:interviewId`.

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `screening` | Recruiter Screening | Initial HR / recruiter phone screening round. |
| `technical` | Technical Round | Coding, algorithm, or technical assessment. *(Default)* |
| `behavioral` | Behavioral / Culture | Culture fit or behavioral assessment round. |
| `system_design` | System Design | Architecture or system design interview. |
| `hr` | HR / Negotiation | Final HR interview or compensation discussion. |
| `other` | Other Round | Unspecified interview format. |

### Interview Status (`InterviewStatus`)
Used in: `POST /applications/:id/interviews`, `PATCH /applications/:id/interviews/:interviewId`.

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `scheduled` | Scheduled | Interview round is confirmed for a future date. *(Default)* |
| `completed` | Completed | Round has taken place. |
| `cancelled` | Cancelled | Interview round was cancelled. |
| `rescheduled` | Rescheduled | Round is being moved to a new time. |

### File Category (`FileCategory`)
Used in: `POST /applications/:id/files`.

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `resume` | Resume / CV | Resume tailored for this application. |
| `cover_letter` | Cover Letter | Custom cover letter. |
| `job_description` | Job Description | Saved PDF / text of original job post. |
| `interview_notes` | Interview Prep Notes | Study notes or interview prep materials. |
| `offer_letter` | Offer Letter | Received offer letter document. |
| `other` | Attachment | General attachment. *(Default)* |

### Work Type Preference (`WorkType`)
Used in: `PATCH /profile` (`jobPreferences.workTypes[]`).

| Enum Value | UI Label | Description |
| :--- | :--- | :--- |
| `remote` | Remote | Fully remote work. |
| `hybrid` | Hybrid | Flexible remote + office presence. |
| `onsite` | On-site | In-office presence required. |

### Appearance Theme (`Theme`)
Defined in User model (`appearance.theme`).

| Enum Value | Meaning |
| :--- | :--- |
| `light` | Light color theme. |
| `dark` | Dark color theme. |
| `system` | Synchronize with operating system theme. *(Default)* |

### Timeline Event Type (`TimelineEventType`)
System-generated types stored in `timeline[].type`.

| Enum Value | Trigger Event |
| :--- | :--- |
| `application_created` | Generated automatically on `POST /applications`. |
| `status_changed` | Generated automatically on status transition (`PATCH /applications/:id/status` or `PATCH /applications/:id`). |
| `note_added` | Generated automatically on `POST /applications/:id/notes`. |
| `interview_scheduled` | Generated automatically on `POST /applications/:id/interviews`. |
| `file_uploaded` | Generated automatically on `POST /applications/:id/files`. |

---

## 3. Server-Generated & Response-Only Fields

The frontend **MUST NOT** include these fields in `POST`, `PUT`, or `PATCH` request bodies. They are generated and returned exclusively by the server in JSON responses:

| Field | Type | Generated By | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Mongoose Object Transformer | Unified unique identifier string (converted from MongoDB `_id`). |
| `_id` | string | MongoDB Engine | Internal BSON ObjectId. |
| `userId` | string | Auth Middleware | Owning user ID attached from Bearer JWT. |
| `createdAt` | string (ISO 8601) | Base Schema Plugin | Timestamp when document was first persisted. |
| `updatedAt` | string (ISO 8601) | Base Schema Plugin | Timestamp when document was last modified. |
| `lastStatusChangedAt` | string (ISO 8601) | Application Service | Timestamp when application status last changed. |
| `timeline` | array | Application Service | Immutably appended history log of application events. |
| `daysOnHold` | number | Dashboard Service | Derived calculation (`(now - lastStatusChangedAt) / 86400000`). |
| `daysOnHold` / `needsAttentionCount` | number | Dashboard Service | Derived dashboard metrics. |

---

## 4. Authentication & Sessions (`/api/v1/auth`, `/api/v1/sessions`)

### `POST /api/v1/auth/register`

#### Purpose
Registers a new user account, creates default user preferences, hashes password with `bcrypt` (cost factor 12), and returns JWT tokens.

#### Authentication
**Public** (Rate Limited: 10 requests per 15 minutes).

#### Path & Query Parameters
None.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | string | **REQUIRED** | No | 2+ chars | Full name of user. Trimmed by server. |
| `email` | string | **REQUIRED** | No | Valid Email | Primary email address. Trimmed and lowercased by server. Must be unique. |
| `password` | string | **REQUIRED** | No | 8+ chars | Raw user password. Min length 8. Hashed via bcrypt before storage. |

#### Field Details & UI Guidance

##### `name`
- **Type:** `string`
- **Required:** Required
- **Validation:** Minimum 2 characters, trimmed.
- **Frontend Control:** Text Input (`type="text"`)
- **Example:** `"Alex Johnson"`

##### `email`
- **Type:** `string`
- **Required:** Required
- **Validation:** Must pass standard email format regex, trimmed and lowercased.
- **Frontend Control:** Email Input (`type="email"`)
- **Example:** `"alex.johnson@example.com"`

##### `password`
- **Type:** `string`
- **Required:** Required
- **Validation:** Minimum 8 characters.
- **Frontend Control:** Password Input (`type="password"`)
- **Example:** `"SecurePassword123!"`

#### Request Examples

##### Minimal & Complete Valid Request
```json
{
  "name": "Alex Johnson",
  "email": "alex.johnson@example.com",
  "password": "SecurePassword123!"
}
```

---

### `POST /api/v1/auth/login`

#### Purpose
Authenticates user email and password credentials, creates a new login session record in MongoDB, and issues Access (15m) and Refresh (30d) tokens.

#### Authentication
**Public** (Rate Limited: 10 requests per 15 minutes).

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `email` | string | **REQUIRED** | No | Valid Email | Account email address. Trimmed and lowercased. |
| `password` | string | **REQUIRED** | No | Non-empty | User password credential. |

#### Request Example
```json
{
  "email": "alex.johnson@example.com",
  "password": "SecurePassword123!"
}
```

---

### `POST /api/v1/auth/refresh`

#### Purpose
Rotates a valid Refresh Token, invalidates the old refresh token, creates a new session token, and issues a fresh Access Token.

#### Authentication
**Public** (Rate Limited).

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `refreshToken` | string | **REQUIRED** | No | String | Unhashed 64-character hex refresh token string issued previously. |

#### Request Example
```json
{
  "refreshToken": "7f8b9a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"
}
```

---

### `POST /api/v1/auth/logout`

#### Purpose
Revokes the active login session associated with the provided refresh token.

#### Authentication
Public / Authenticated.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `refreshToken` | string | **REQUIRED** | No | String | Refresh token string of the session to revoke. |

#### Implementation Note
The route `POST /api/v1/auth/logout` does not enforce the `requireAuth` middleware explicitly in `auth.routes.ts`, but consumes `req.body.refreshToken` to find and mark the corresponding `Session` document as `revokedAt = new Date()`.

---

### `POST /api/v1/auth/change-password`

#### Purpose
Updates the authenticated user's password and revokes ALL active sessions across all devices.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `currentPassword` | string | **REQUIRED** | No | Non-empty | Existing user password. Verified against database `passwordHash`. |
| `newPassword` | string | **REQUIRED** | No | 8+ chars | New password. Must be at least 8 characters long. |

#### Request Example
```json
{
  "currentPassword": "SecurePassword123!",
  "newPassword": "NewSuperSecretPassword456!"
}
```

---

### `DELETE /api/v1/sessions/:id`

#### Purpose
Revokes a specific active session by Session ID.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Path Parameters

| Parameter | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | **REQUIRED** | MongoDB ObjectId string of the target `Session` document to revoke. |

---

## 5. User Profile (`/api/v1/profile`)

### `PATCH /api/v1/profile`

#### Purpose
Applies partial, deep-nested updates to the user profile without overwriting unspecified sibling fields. Updating `identity.email` keeps the authentication credentials synchronized.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Path & Query Parameters
None.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `identity` | object | **OPTIONAL** | No | — | Personal identity information wrapper object. |
| `identity.name` | string | **OPTIONAL** | No | 2+ chars | User full name. Min 2 chars. |
| `identity.email` | string | **OPTIONAL** | No | Valid Email | New unique email. Triggers password identity update. |
| `identity.avatarUrl` | string | **OPTIONAL** | No | URL or `""` | Avatar image URL. Accepts valid URL or empty string. |
| `profile` | object | **OPTIONAL** | No | — | Personal profile contact details wrapper. |
| `profile.phone` | string | **OPTIONAL** | No | String | Phone number string. |
| `profile.location` | string | **OPTIONAL** | No | String | Geographical location (city, country). |
| `profile.timezone` | string | **OPTIONAL** | No | String (min 1) | User timezone identifier (e.g. `"America/New_York"`, `"UTC"`). |
| `profile.bio` | string | **OPTIONAL** | No | String | Short user biography or elevator pitch. |
| `professional` | object | **OPTIONAL** | No | — | Professional background wrapper object. |
| `professional.headline` | string | **OPTIONAL** | No | String | Professional title / tagline (e.g., `"Senior Full Stack Engineer"`). |
| `professional.yearsOfExperience` | number | **OPTIONAL** | No | Min 0 | Total years of professional experience. |
| `professional.skills` | array[string] | **OPTIONAL** | No | Non-empty strings | Array of skill strings (e.g. `["TypeScript", "Node.js", "MongoDB"]`). |
| `professional.summary` | string | **OPTIONAL** | No | String | Detailed professional career summary. |
| `jobPreferences` | object | **OPTIONAL** | No | — | Job search targeting preferences wrapper object. |
| `jobPreferences.roles` | array[string] | **OPTIONAL** | No | Strings | Target job titles (e.g. `["Backend Engineer", "Tech Lead"]`). |
| `jobPreferences.locations` | array[string] | **OPTIONAL** | No | Strings | Target work locations (e.g. `["Remote", "New York"]`). |
| `jobPreferences.workTypes` | array[string] | **OPTIONAL** | No | `remote`, `hybrid`, `onsite` | Allowed work arrangements. |
| `jobPreferences.industries` | array[string] | **OPTIONAL** | No | Strings | Target industry domains (e.g. `["SaaS", "Fintech"]`). |
| `jobPreferences.weeklyApplicationGoal` | integer | **OPTIONAL** | No | Min 1 | Target number of applications submitted per week. *(Default: 5)* |

#### Field Details & UI Guidance

##### `jobPreferences.workTypes`
- **Type:** `array[string]`
- **Required:** Optional
- **Allowed Values:** `["remote", "hybrid", "onsite"]`
- **Description:** Preferred work arrangements.
- **Frontend Control:** Checkbox Group / Multi-select
- **Example:** `["remote", "hybrid"]`

##### `jobPreferences.weeklyApplicationGoal`
- **Type:** `integer`
- **Required:** Optional
- **Validation:** Minimum value 1.
- **Frontend Control:** Number Input / Slider (`min="1"`, `step="1"`)
- **Example:** `10`

#### Request Examples

##### Minimal Valid Request (Updating single field)
```json
{
  "profile": {
    "location": "Austin, TX"
  }
}
```

##### Complete Request
```json
{
  "identity": {
    "name": "Alex Johnson",
    "email": "alex.johnson@example.com",
    "avatarUrl": "https://cdn.jobpholio.com/avatars/alex.png"
  },
  "profile": {
    "phone": "+1-512-555-0199",
    "location": "Austin, TX",
    "timezone": "America/Chicago",
    "bio": "Passionate backend engineer specializing in distributed systems and Node.js."
  },
  "professional": {
    "headline": "Senior Backend Architect",
    "yearsOfExperience": 7,
    "skills": ["TypeScript", "Node.js", "Express", "MongoDB", "Redis", "Docker"],
    "summary": "7+ years designing scalable cloud REST APIs and microservices."
  },
  "jobPreferences": {
    "roles": ["Senior Backend Engineer", "Lead Engineer"],
    "locations": ["Remote", "Austin, TX"],
    "workTypes": ["remote", "hybrid"],
    "industries": ["Developer Tools", "SaaS", "Fintech"],
    "weeklyApplicationGoal": 7
  }
}
```

---

## 6. Job Applications (`/api/v1/applications`)

### `GET /api/v1/applications`

#### Purpose
Fetches a paginated list of job applications belonging to the authenticated user with multi-field search, filtering, and sorting.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Query Parameters

| Parameter | Type | Required? | Default | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `search` | string | **OPTIONAL** | — | String | Case-insensitive regex match against `company.name` or `job.title`. |
| `status` | string | **OPTIONAL** | — | `applied`, `on_hold`, `interview`, `offer`, `rejected` | Filter by application status. |
| `source` | string | **OPTIONAL** | — | `linkedin`, `naukri`, `indeed`, `company_site`, `manual`, `other` | Filter by application source channel. |
| `location` | string | **OPTIONAL** | — | String | Case-insensitive regex filter on `job.location`. |
| `dateFrom` | string | **OPTIONAL** | — | ISO 8601 Date | Filter applications submitted on or after this date. |
| `dateTo` | string | **OPTIONAL** | — | ISO 8601 Date | Filter applications submitted on or before this date. |
| `sortBy` | string | **OPTIONAL** | `dateApplied` | `dateApplied`, `createdAt`, `updatedAt`, `lastStatusChangedAt`, `companyName` | Database field to sort by. |
| `sortOrder` | string | **OPTIONAL** | `desc` | `asc`, `desc` | Sort order direction. |
| `page` | integer | **OPTIONAL** | `1` | Min 1 | Page number for pagination. Coerced from string. |
| `limit` | integer | **OPTIONAL** | `20` | Min 1, Max 100 | Items per page. Coerced from string. |

---

### `POST /api/v1/applications`

#### Purpose
Creates a new job application record and automatically appends the initial `application_created` timeline event.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `company` | object | **REQUIRED** | No | — | Company info wrapper object. |
| `company.name` | string | **REQUIRED** | No | 1+ chars | Company name. Trimmed by server. |
| `company.logoUrl` | string | **OPTIONAL** | No | URL or `""` | Company logo image URL. |
| `company.website` | string | **OPTIONAL** | No | URL or `""` | Company main website URL. |
| `company.description` | string | **OPTIONAL** | No | String | Brief notes/description about the company. |
| `job` | object | **REQUIRED** | No | — | Job details wrapper object. |
| `job.title` | string | **REQUIRED** | No | 1+ chars | Job position title. Trimmed by server. |
| `job.jobId` | string | **OPTIONAL** | No | String | External Job ID or Requisition number. |
| `job.location` | string | **OPTIONAL** | No | String | Job location (e.g. `"San Francisco, CA"`). |
| `job.employmentType` | string | **OPTIONAL** | No | `full_time`, `part_time`, `contract`, `internship` | Employment arrangement. |
| `job.jobUrl` | string | **OPTIONAL** | No | URL or `""` | Link to original job posting. |
| `job.salary` | object | **OPTIONAL** | No | — | Salary range wrapper object. |
| `job.salary.min` | number | **OPTIONAL** | No | Min 0 | Minimum salary boundary. |
| `job.salary.max` | number | **OPTIONAL** | No | Min 0 | Maximum salary boundary. |
| `job.salary.currency` | string | **OPTIONAL** | No | String | Currency code. *(Default: `"USD"`)* |
| `source` | string | **OPTIONAL** | No | `linkedin`, `naukri`, `indeed`, `company_site`, `manual`, `other` | Channel where job was found. *(Default: `"manual"`)* |
| `status` | string | **OPTIONAL** | No | `applied`, `on_hold`, `interview`, `offer`, `rejected` | Initial application state. *(Default: `"applied"`)* |
| `dateApplied` | string | **OPTIONAL** | No | Date string | Date application submitted. *(Default: Server `now`)* |
| `nextStep` | object | **OPTIONAL** | No | — | Initial next step action object. |
| `nextStep.type` | string | **OPTIONAL** | No | String | Type of next action (e.g. `"follow_up"`). |
| `nextStep.title` | string | **OPTIONAL** | No | String | Title of next action (e.g. `"Send follow-up email"`). |
| `nextStep.dueAt` | string | **OPTIONAL** | No | Date string | Due date for next action. |

#### Request Examples

##### Minimal Valid Request (Only mandatory fields)
```json
{
  "company": {
    "name": "Stripe"
  },
  "job": {
    "title": "Senior Backend Engineer"
  }
}
```

##### Complete Request
```json
{
  "company": {
    "name": "Stripe",
    "logoUrl": "https://logo.clearbit.com/stripe.com",
    "website": "https://stripe.com",
    "description": "Financial infrastructure platform for businesses."
  },
  "job": {
    "title": "Senior Backend Engineer",
    "jobId": "REQ-2026-948",
    "location": "San Francisco, CA (Hybrid)",
    "employmentType": "full_time",
    "jobUrl": "https://stripe.com/jobs/req-2026-948",
    "salary": {
      "min": 185000,
      "max": 230000,
      "currency": "USD"
    }
  },
  "source": "linkedin",
  "status": "applied",
  "dateApplied": "2026-09-20T10:00:00.000Z",
  "nextStep": {
    "type": "follow_up",
    "title": "Follow up with recruiter Sarah",
    "dueAt": "2026-09-27T17:00:00.000Z"
  }
}
```

---

### `PATCH /api/v1/applications/:id`

#### Purpose
Updates mutable application properties. If `status` changes, the backend automatically updates `lastStatusChangedAt` and appends a `status_changed` event to `timeline[]`.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Path Parameters

| Parameter | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | **REQUIRED** | Application ObjectId string. Must belong to authenticated user. |

#### Request Body Fields (All Optional)

| Field | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `company` | object | **OPTIONAL** | Partial company update object. |
| `job` | object | **OPTIONAL** | Partial job update object. |
| `source` | string | **OPTIONAL** | New source channel enum. |
| `status` | string | **OPTIONAL** | New status enum. Triggers timeline side effect. |
| `dateApplied` | string | **OPTIONAL** | Updated application submission date. |
| `nextStep` | object | **OPTIONAL** | Updated next step object (`type`, `title`, `dueAt`, `completedAt`). |

---

### `PATCH /api/v1/applications/:id/status`

#### Purpose
Dedicated domain action to transition application status, update `lastStatusChangedAt`, and record an optional status note in `timeline[]`.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Path Parameters

| Parameter | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | **REQUIRED** | Application ObjectId string. |

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `status` | string | **REQUIRED** | No | `applied`, `on_hold`, `interview`, `offer`, `rejected` | Target application status. |
| `note` | string | **OPTIONAL** | No | String | Contextual note explaining status change. |

#### Request Example
```json
{
  "status": "interview",
  "note": "Recruiter call completed. Scheduled Technical System Design round."
}
```

---

## 7. Notes, Files & Interviews Subdocuments (`/api/v1/applications/:id/...`)

### `POST /api/v1/applications/:id/notes`

#### Purpose
Adds a new note subdocument to `notes[]` and appends a `note_added` timeline event.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `content` | string | **REQUIRED** | No | 1+ chars | Note text. Trimmed by server. |

#### Request Example
```json
{
  "content": "Review system design concepts: distributed locking, database sharding, and Redis caching."
}
```

---

### `PATCH /api/v1/applications/:id/notes/:noteId`

#### Purpose
Updates existing note content.

#### Path Parameters

| Parameter | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | **REQUIRED** | Application ObjectId. |
| `noteId` | string | **REQUIRED** | Note subdocument ObjectId. |

#### Request Body Fields

| Field | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `content` | string | **REQUIRED** | Updated note text. |

---

### `POST /api/v1/applications/:id/files`

#### Purpose
Attaches file metadata to `files[]` and records a `file_uploaded` timeline event.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | string | **REQUIRED** | No | 1+ chars | File display name (e.g. `"Stripe_Backend_Resume.pdf"`). |
| `url` | string | **REQUIRED** | No | Valid URL | Public or signed cloud storage download URL. |
| `mimeType` | string | **REQUIRED** | No | MIME String | File MIME type (e.g. `"application/pdf"`). |
| `size` | number | **REQUIRED** | No | Min 0 | File size in bytes. |
| `category` | string | **OPTIONAL** | No | `resume`, `cover_letter`, `job_description`, `interview_notes`, `offer_letter`, `other` | Category tag. *(Default: `"other"`)* |

#### Request Example
```json
{
  "name": "Stripe_Tailored_Resume.pdf",
  "url": "https://storage.googleapis.com/jobpholio-docs/resumes/stripe-backend-2026.pdf",
  "mimeType": "application/pdf",
  "size": 245800,
  "category": "resume"
}
```

---

### `POST /api/v1/applications/:id/interviews`

#### Purpose
Schedules an interview round subdocument in `interviews[]`. Auto-updates application `status` to `'interview'` if currently `'applied'`, updates `nextStep`, and logs `interview_scheduled` to `timeline[]`.

#### Request Body Fields

| Field | Type | Required? | Nullable? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `round` | string | **REQUIRED** | No | 1+ chars | Interview round name (e.g. `"Technical Architecture Round"`). |
| `scheduledAt` | string | **REQUIRED** | No | ISO Datetime | Scheduled interview start time. |
| `endAt` | string | **OPTIONAL** | No | ISO Datetime | Expected interview end time. |
| `timezone` | string | **OPTIONAL** | No | String | Timezone identifier. *(Default: `"UTC"`)* |
| `type` | string | **OPTIONAL** | No | `screening`, `technical`, `behavioral`, `system_design`, `hr`, `other` | Interview category. *(Default: `"technical"`)* |
| `interviewer` | string | **OPTIONAL** | No | String | Name(s) / title(s) of interviewer(s). |
| `meetingUrl` | string | **OPTIONAL** | No | URL or `""` | Video call meeting URL (Google Meet, Zoom, Teams). |
| `notes` | string | **OPTIONAL** | No | String | Preparation notes or interview topics. |
| `status` | string | **OPTIONAL** | No | `scheduled`, `completed`, `cancelled`, `rescheduled` | Round status. *(Default: `"scheduled"`)* |

#### Request Examples

##### Minimal Valid Request
```json
{
  "round": "Technical Screening",
  "scheduledAt": "2026-10-05T14:00:00.000Z"
}
```

##### Complete Request
```json
{
  "round": "System Architecture & Coding",
  "scheduledAt": "2026-10-05T14:00:00.000Z",
  "endAt": "2026-10-05T15:00:00.000Z",
  "timezone": "America/New_York",
  "type": "system_design",
  "interviewer": "Marcus Vance (Staff Engineer)",
  "meetingUrl": "https://meet.google.com/xyz-abc-def",
  "notes": "Focus on high-throughput queue processing and idempotency keys.",
  "status": "scheduled"
}
```

---

### `PATCH /api/v1/applications/:id/interviews/:interviewId`

#### Purpose
Updates an existing interview round subdocument.

#### Path Parameters

| Parameter | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | **REQUIRED** | Application ObjectId. |
| `interviewId` | string | **REQUIRED** | Interview subdocument ObjectId. |

#### Request Body Fields (All Optional)
`round`, `scheduledAt`, `endAt`, `timezone`, `type`, `interviewer`, `meetingUrl`, `notes`, `status`.

---

## 8. Derived Read-Models & Analytics (`/api/v1/dashboard`, `/api/v1/calendar`)

### `GET /api/v1/dashboard`

#### Purpose
Returns real-time derived analytics, counts, upcoming interviews, and needs-attention application alerts.

#### Authentication
**Required** (`Bearer <access_token>`).

#### Path / Query / Body Parameters
None.

#### Response Data Contract

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

---

### `GET /api/v1/calendar/events`

#### Purpose
Returns a normalized array of interview events projected from all user applications.

#### Query Parameters

| Parameter | Type | Required? | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `start` | string | **OPTIONAL** | ISO Date / Datetime | Filter interviews scheduled on or after this date. |
| `end` | string | **OPTIONAL** | ISO Date / Datetime | Filter interviews scheduled on or before this date. |

---

## 9. Future Phase API Contracts (Phases 10–14 Planned Specifications)

The following endpoints are specified in `API.md` and `IMPLEMENTATION_PLAN.md` for upcoming development phases:

### Phase 10: In-App Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` — List user notifications (`read`, `unread`).
- `PATCH /api/v1/notifications/:id/read` — Mark single notification read.
- `PATCH /api/v1/notifications/read-all` — Mark all user notifications read.

### Phase 11: Reusable Master Documents (`/api/v1/documents`)
- `GET /api/v1/documents` — List reusable master user documents (resumes, cover letter templates).
- `POST /api/v1/documents` — Upload new master document metadata (`name`, `url`, `category`, `isDefault`).

### Phase 12: Settings, Export & Data Privacy (`/api/v1/settings`)
- `GET /api/v1/settings` — Get system settings (`appearance`, `notificationPreferences`, `applicationTracking`).
- `PATCH /api/v1/settings` — Update system settings (e.g. `onHoldThresholdDays`, `theme`).
- `POST /api/v1/applications/export` — Trigger synchronous CSV export of all user applications.
- `DELETE /api/v1/settings/data` — Wipe user applications, notes, files, and notifications while preserving account.
- `DELETE /api/v1/settings/account` — Soft-delete user account and revoke all active sessions.

### Phase 13: Analytical Insights (`/api/v1/insights`)
- `GET /api/v1/insights` — Aggregated job-search conversion funnel analytics (conversion rates, application timeline charts, top sources).

---

## 10. Documentation / Implementation Notes & Discrepancies

The following implementation details were identified during codebase inspection:

1. **Logout Authentication Middleware (`POST /api/v1/auth/logout`):**
   - **Observation:** In `src/modules/auth/auth.routes.ts`, line 14 registers `authRouter.post('/logout', AuthController.logout);` without `requireAuth` middleware.
   - **Contract Note:** The route consumes `{ "refreshToken": "..." }` from `req.body` to identify and revoke the target session. Sending `Authorization: Bearer <access_token>` is optional for this route.

2. **User Profile Settings Boundaries (`PATCH /api/v1/profile` vs `User` Model):**
   - **Observation:** `src/modules/users/user.model.ts` defines `notificationPreferences`, `appearance` (`theme`, `compactMode`), and `applicationTracking` (`onHoldThresholdDays`) on the `User` schema.
   - **Contract Note:** `updateProfileSchema` in `src/modules/profile/profile.schema.ts` explicitly restricts `PATCH /api/v1/profile` to `identity`, `profile`, `professional`, and `jobPreferences`. Appearance, notifications, and tracking thresholds are preserved for dedicated settings routes (`PATCH /api/v1/settings`) in Phase 12.

3. **URL Validation Robustness in Schemas:**
   - **Observation:** `createApplicationSchema` uses `optionalUrlSchema` (`z.string().trim().optional().or(z.literal(''))`) which accepts optional strings without failing validation if frontend clients omit protocol prefixes.

4. **Strict Key Response Guarantee for Dashboard (`GET /api/v1/dashboard`):**
   - **Observation:** `DashboardService.getDashboard()` guarantees that `data` contains exactly 4 top-level keys (`metrics`, `recentApplications`, `needsAttentionApplications`, `upcomingInterviews`), and `metrics` contains exactly 5 numeric counters.
