# Dashboard Module Specifications & Architecture

## Overview
The Dashboard module (`src/modules/dashboard/`) provides real-time aggregated metrics, activity streams, calendar interview highlights, and needs-attention alerts for the authenticated user.

## Read-Model Strategy
- **Zero Storage Overhead:** The dashboard is implemented strictly as a **derived read model**. No `Dashboard` MongoDB collection exists.
- **On-the-Fly Aggregation:** All counters, status breakdowns, timelines, and alert indicators are calculated dynamically from the existing `applications` and `users` collections.

## Key Subsystems

### 1. Needs Attention Engine
Applications marked with status `on_hold` generate a Needs Attention alert if the elapsed days since `lastStatusChangedAt` exceeds or equals the user's configured threshold:
```
elapsedDays = (currentDate - lastStatusChangedAt) / (24 * 60 * 60 * 1000)
needsAttention = status === 'on_hold' AND elapsedDays >= user.applicationTracking.onHoldThresholdDays
```
Default threshold: **14 days**.

### 2. Status Breakdown & Statistics
Provides accurate counts for all 5 core application statuses (`applied`, `on_hold`, `interview`, `offer`, `rejected`), along with derived rates:
- **Active Applications:** `applied + on_hold + interview`
- **Interview Rate:** `(interview + offer) / totalApplications * 100`
- **Offer Rate:** `offer / totalApplications * 100`

### 3. Upcoming Interviews
Projects upcoming interview rounds (`scheduledAt >= currentDate` AND `status !== 'cancelled'`) sorted in ascending chronological order.

### 4. Recent Activity Stream
Aggregates recent timeline entries across all user applications, sorted descending by `occurredAt`.

## API Endpoints
- `GET /api/v1/dashboard` — Authenticated dashboard analytics.
