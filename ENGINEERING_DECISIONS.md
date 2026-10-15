# Engineering Decisions

This document explains the reasoning behind the key architectural, data, and security decisions in this project, per the assessment's requirements.

## 1. Why this project architecture?

**Backend** follows a layered architecture: `routes → middlewares → controllers → services → models`.

- **Controllers stay thin** - they parse the request, call a service, and shape the response via `ApiResponse`. No business logic lives in a controller.
- **Services own business logic** - slot generation, booking rules, status-transition validation, and auth all live in `src/services/*`. This is what the PDF's "Business logic should remain inside services" asks for, and it makes the logic unit-testable without spinning up Express or a live HTTP request.
- **Validators (Zod) run before controllers**, via a single `validate(schema)` middleware, so request shape is never trusted implicitly inside a service.
- **A single `ApiError` / `ApiResponse` pair** enforces the consistent `{ success, message, data, meta }` envelope and consistent HTTP status codes everywhere, instead of every controller building its own response shape.

**Frontend** mirrors this separation: `api/*` (HTTP calls only) → `hooks/*` (React Query wiring: caching, invalidation) → `components/*` (presentation) → `pages/*` (composition). This keeps data-fetching logic out of components, so components stay easy to reuse and test.

**Why not a monolithic MVC or a microservice split?** This is a single bounded context (appointment management for one EMR module) with a small team/timeline. A layered modular monolith gets the maintainability benefits of separation of concerns without the operational overhead (service discovery, distributed transactions, network latency) that microservices would add for no real payoff at this scale. See Q7 for how this would change at much larger scale.

## 2. How was the MongoDB schema designed?

Full detail in [docs/DATABASE.md](docs/DATABASE.md). Summary of the key decisions:

- **`User` (auth/identity) is separate from `Doctor` (clinical profile)**, linked 1:1. This keeps authentication concerns (password, role, tokens) independent of profile concerns (department, specialization) that only apply to doctors - a receptionist or super admin never carries unused doctor-shaped fields, and a doctor's profile can be edited without touching login credentials.
- **Slots are never persisted.** A `DoctorSchedule` document stores *rules* (working days, sessions, slot duration, breaks); actual bookable slots are computed on request from those rules (`utils/slotGenerator.js`) and cross-referenced against existing `Appointment` documents. Storing materialized slots would require a migration/regeneration job every time a doctor's hours change and would bloat the database with mostly-identical daily documents.
- **Appointment is the hub**, referencing `Patient`, `Doctor`, `Department`, and `createdBy` (the booking user) as ObjectIds rather than embedding, since appointments are queried/filtered/sorted independently of their parents at high volume - embedding would duplicate patient/doctor data across every appointment and make updates (e.g. a patient's phone number changing) inconsistent.
- **Soft state over hard deletes**: appointments are cancelled (status transition), never deleted; users are deactivated (`isActive: false`), never deleted. Medical/audit records must be retrievable for compliance even after a visit is "removed" from the active view.

## 3. How was double-booking prevented?

Two layers, intentionally redundant:

1. **Application-level pre-check** (`assertSlotIsValid` in `appointment.service.js`): confirms the requested time is a real slot (inside a working session, not inside a break, not in the past) before attempting to write. This gives fast, specific error messages for the common "bad slot" case.
2. **The actual guarantee - a partial unique index** on `Appointment: { doctor: 1, slotStart: 1 }`, scoped to active statuses (`scheduled|arrived|completed`) via `partialFilterExpression`. MongoDB enforces this uniqueness **atomically at the storage layer**, so when two requests race to insert the same `{doctor, slotStart}` simultaneously, the database itself allows exactly one to succeed and rejects the other with a duplicate-key error (`E11000`) - regardless of what either request's application code had already decided. The pre-check in step 1 cannot do this safely by itself: "check availability, then insert" always has a race window between the two steps; a unique index has no such window because the uniqueness check and the write are the same atomic operation.

   The index is **partial** rather than fully unique so a `cancelled` appointment frees the slot for rebooking without needing a cleanup job or a different field shape.

   Patient creation (for new patients) and the appointment insert run inside a **Mongo transaction** (`mongoose.startSession()` + `withTransaction`) so a new patient record is never left orphaned if the appointment insert then fails the uniqueness check - requires MongoDB Atlas (replica-set backed), which is also why the project targets Atlas rather than a standalone local `mongod`.

3. The duplicate-key error is caught and converted into a clean `409 Conflict` ("This slot was just booked by someone else...") by the centralized error middleware, so the client never sees a raw Mongo error.

## 4. Which database indexes were created, and why?

See the full table in [docs/DATABASE.md](docs/DATABASE.md#indexes-and-why). Highlights:

- `{ doctor: 1, slotStart: 1 }` unique/partial on `appointments` - the double-booking guarantee (above), and doubles as the index used for "does this doctor have an appointment at this time" lookups.
- `{ slotStart: 1 }`, `{ status: 1, slotStart: 1 }`, `{ department: 1, slotStart: 1 }`, `{ patient: 1, slotStart: -1 }` on `appointments` - these cover the required filter/search combinations (doctor, department, date range, status, patient history) so the appointment list endpoint doesn't fall back to collection scans under the required server-side filtering.
- Text index on `patients.{name, mobile, patientId}` plus single-field indexes on `mobile` and `patientId` - existing-patient search is a hot path during booking and needs to stay fast as the patient table grows.
- TTL index on `refresh_tokens.expiresAt` - expired tokens are purged automatically by MongoDB rather than needing a cron job.
- Unique index on `users.email` - both the login lookup and the uniqueness constraint.

## 5. What security measures were implemented?

- **Password hashing**: bcrypt, cost factor 12, via a static `User.hashPassword` helper (never raw bcrypt calls scattered through the codebase).
- **JWT access + refresh tokens**: short-lived access token (15m default) carried in `Authorization: Bearer`; long-lived refresh token (7d default) stored as an **httpOnly, sameSite cookie** scoped to `/api/v1/auth` - never readable by JavaScript, which closes the XSS-exfiltration path a `localStorage` refresh token would have.
- **Refresh tokens are hashed at rest** (`RefreshToken.tokenHash`, SHA-256) - only the hash is stored, mirroring the password-hashing principle, so a database leak doesn't hand out usable sessions.
- **Refresh token rotation**: every refresh issues a new token and revokes the old one (`replacedByHash` tracks the chain), so a stolen refresh token can only be replayed once before legitimate use invalidates it.
- **RBAC middleware** (`authorize(...roles)`) gates every protected route; doctors are additionally hard-restricted to their own appointments at the **service layer** (`buildListFilter`, `getAppointmentById`, `updateAppointment`), not just the route layer, so a doctor cannot read another doctor's appointment even by guessing an ID.
- **Input validation**: every request body/query/params is validated against a Zod schema before reaching a controller; invalid input never reaches business logic.
- **No sensitive data leakage**: `passwordHash` has `select: false` by default and is stripped from `toJSON`; the centralized error handler never forwards raw Mongo/driver errors or stack traces to the client (logs them server-side instead, returns a generic message for unexpected 5xx errors).
- **Security headers & transport hygiene**: `helmet()`, strict CORS pinned to a single configured origin with credentials, `express-rate-limit` on the whole API surface, `trust proxy` configured for correct client IPs behind a reverse proxy.
- **Environment-based configuration**: all secrets (JWT secrets, Mongo URI) come from environment variables (`config/env.js`), never hardcoded; the app refuses to boot in production without them.
- **Audit trail**: every login, appointment create/update/cancel/arrive is recorded in `audit_logs` with user, role, action, entity, and timestamp - required for EMR-grade accountability.

## 6. What performance optimizations were applied?

**Backend**
- Indexes listed above so every required filter (doctor, department, date range, status, patient search) hits an index instead of a collection scan.
- Appointment list uses a **single aggregation pipeline** (`$match → $lookup → $sort → $facet`) to get filtered, sorted, paginated results **and** the total count in one round trip, instead of a separate `find()` + `countDocuments()` + N `populate()` calls.
- `.lean()` on read-only queries (doctor roster, patient search, slot-booking lookups) - skips Mongoose document hydration/change-tracking overhead for data that's only ever serialized back out.
- `gzip` compression (`compression` middleware) on all responses.
- Slots are generated in-memory from a small schedule document rather than queried from a large pre-materialized collection - this is both a data-design and a performance decision (see Q2).

**Frontend**
- **React Query** caches all server state with a 30s default `staleTime`, so navigating between pages (e.g. Dashboard → Appointments → Dashboard) doesn't always refetch, and concurrent components requesting the same key (e.g. the doctor list used by both the Scheduler and Booking filters) share one request instead of firing duplicates.
- Debounced search inputs (patient search, appointment list search) delay the API call until typing pauses, directly addressing "avoid unnecessary database queries" from the client side.
- `React.memo` on list-heavy, frequently-re-rendered components (`SlotGrid`, `AppointmentTable`/`AppointmentRow`, `Pagination`, `StatusBadge`, `SchedulerFilters`) so, e.g., typing in one filter field doesn't re-render every row of an unrelated table.
- Pagination (`limit`/`page`) is server-side everywhere appointments or patients are listed, so the client never pulls an unbounded result set.

## 7. If this needed to support millions of appointments, what would change?

- **Sharding** the `appointments` collection, most naturally by `doctor` (or a `{doctor, slotStart}` compound shard key) since nearly every query is doctor- or date-scoped - this keeps the hot write path (booking) and the hot read path (scheduler view) on the same shard.
- **Archiving**: move appointments older than a retention window (e.g. 18-24 months) into a cold/archive collection or separate storage tier, keeping the "live" collection - and its indexes - small and fast; audit logs would follow the same pattern with a TTL or scheduled export to cold storage.
- **Caching layer** (Redis) in front of `GET /slots` and `GET /doctors` - both are read-heavy and change infrequently relative to how often they're requested; cache invalidation would hook into the same create/update/cancel events that already drive the Socket.IO broadcasts.
- **Separate read replicas** for reporting/analytics queries so heavy aggregate queries (dashboards, audit exports) never compete with booking-path latency on the primary.
- **Queue-based writes for non-critical paths**: audit log writes and notification fan-out could move off the request's critical path onto a message queue (e.g. BullMQ/RabbitMQ) so a slow audit write never delays a booking response.
- **Horizontal scaling of the Socket.IO layer** via a Redis adapter (`socket.io-redis`), since room-based broadcast state currently lives in a single Node process's memory and wouldn't work correctly across multiple API instances behind a load balancer.
- **Splitting the monolith where load profiles actually diverge** - e.g. a dedicated booking/concurrency service if write contention on hot slots became the bottleneck - rather than a blanket microservice rewrite, which the current scale does not justify (see Q1).

---

## HTTP status codes used

| Code | Meaning | Used for |
|---|---|---|
| 200 | OK | Successful reads/updates |
| 201 | Created | Appointment/staff creation |
| 400 | Bad Request | Validation failures, invalid slot/transition |
| 401 | Unauthorized | Missing/invalid/expired tokens, bad credentials |
| 403 | Forbidden | RBAC violations (role or ownership) |
| 404 | Not Found | Missing doctor/patient/appointment/schedule, unknown route |
| 409 | Conflict | Double-booking race, duplicate email |
| 500 | Internal Server Error | Unexpected/programmer errors (never leaks internals) |
