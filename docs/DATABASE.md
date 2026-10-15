# Database Design

MongoDB Atlas (cloud), accessed via Mongoose. Target database: `emr_appointments`.

## Entity relationship overview

```
 User (auth/identity) ──1:1──> Doctor (profile)        Department
    │  role: super_admin|receptionist|doctor               │
    │                                                        │
    └──creates──> Doctor, Receptionist (User.createdBy)      │
                                                               │
 Doctor ──N:1──> Department                                   │
 Doctor ──1:1──> DoctorSchedule                                │
                                                                 │
 Patient ──1:N──> Appointment <──N:1── Doctor                  │
                        │       <──N:1── Department ────────────┘
                        └──N:1── User (createdBy, receptionist/admin)

 RefreshToken ──N:1──> User
 AuditLog ──N:1──> User
```

- **User → Doctor** is 1:1: `User.doctorProfile` (only set when `role: 'doctor'`) points to the `Doctor` profile, and `Doctor.user` points back. Auth/identity concerns stay in `User`; clinical/staffing concerns (department, specialization) stay in `Doctor`. This lets a doctor's profile evolve independently of login mechanics.
- **Doctor → DoctorSchedule** is 1:1 (one active weekly configuration per doctor). Slots are **never stored** - they're generated on demand from this document (see `backend/src/utils/slotGenerator.js`), so changing a doctor's hours instantly reshapes future availability with no migration.
- **Appointment** is the central transactional document, referencing `Patient`, `Doctor`, `Department`, and the booking `User` (`createdBy`).

## Collections

### users
| Field | Type | Notes |
|---|---|---|
| name | String | |
| email | String | unique, indexed |
| passwordHash | String | bcrypt, `select: false` by default |
| role | String enum | `super_admin \| receptionist \| doctor` |
| doctorProfile | ObjectId → doctors | only for role `doctor` |
| isActive | Boolean | soft-disable instead of deleting |
| createdBy | ObjectId → users | who provisioned this account |

### doctors
| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | unique |
| name, specialization | String | |
| department | ObjectId → departments | indexed |
| isActive | Boolean | |

### departments
`name` (unique), `code` (unique), `description`, `isActive`.

### doctor_schedules
| Field | Type | Notes |
|---|---|---|
| doctor | ObjectId → doctors | unique (one schedule per doctor) |
| slotDurationMinutes | Number | e.g. 15 |
| weeklySchedule | Array[7] | one entry per `dayOfWeek` (0-6), each with `isWorkingDay`, `sessions: [{startTime,endTime}]`, `breaks: [{startTime,endTime}]` |

### patients
| Field | Type | Notes |
|---|---|---|
| patientId | String | human-friendly, auto-generated (`PTxxxxxxxx`), unique, indexed |
| name | String | indexed, part of text index |
| mobile | String | indexed, part of text index |
| gender, dateOfBirth, address | | |

### appointments
| Field | Type | Notes |
|---|---|---|
| patient | ObjectId → patients | indexed |
| doctor | ObjectId → doctors | indexed |
| department | ObjectId → departments | indexed |
| slotStart, slotEnd | Date | real Date objects, not strings |
| status | String enum | `scheduled → arrived → completed`, or `→ cancelled` |
| purpose, notes, consultationNotes | String | |
| arrivedAt, cancelledAt, cancelReason | | |
| createdBy | ObjectId → users | |

### refresh_tokens
`user`, `tokenHash` (SHA-256 of the raw token - the raw value is never stored), `expiresAt` (TTL-indexed), `revokedAt`, `replacedByHash` (rotation chain).

### audit_logs
`user`, `role`, `action` (enum), `entity`, `entityId`, `metadata`, `createdAt` (indexed, descending).

## Indexes and why

| Collection | Index | Purpose |
|---|---|---|
| appointments | `{ doctor: 1, slotStart: 1 }` **unique, partial** (`status in [scheduled,arrived,completed]`) | **Double-booking prevention** - the actual concurrency guarantee. See ENGINEERING_DECISIONS.md. |
| appointments | `{ slotStart: 1 }` | Date-range filtering/sorting in the appointment list. |
| appointments | `{ patient: 1, slotStart: -1 }` | A patient's appointment history, most recent first. |
| appointments | `{ department: 1, slotStart: 1 }` | Department dashboards/filters. |
| appointments | `{ status: 1, slotStart: 1 }` | Status filter combined with date sort (today's "scheduled" list, etc.). |
| patients | `{ patientId: 1 }` unique | Lookup by human-facing ID. |
| patients | `{ name, mobile, patientId: 'text' }` | Existing-patient search (name/mobile/ID) without a full collection scan. |
| doctors | `{ department: 1, isActive: 1 }` | Scheduler/booking doctor-by-department filter. |
| users | `{ email: 1 }` unique | Login lookup + uniqueness constraint. |
| refresh_tokens | `{ expiresAt: 1 }` TTL | Automatic cleanup of expired tokens. |
| audit_logs | `{ createdAt: -1 }` | Recent-activity queries. |

## Sample documents

```json
// departments
{ "_id": "d1", "name": "Cardiology", "code": "CARD" }

// doctors
{ "_id": "doc1", "user": "u2", "name": "Dr. Asha Rao", "department": "d1", "specialization": "Cardiologist", "isActive": true }

// doctor_schedules
{
  "_id": "sch1", "doctor": "doc1", "slotDurationMinutes": 15,
  "weeklySchedule": [
    { "dayOfWeek": 1, "isWorkingDay": true,
      "sessions": [{ "startTime": "09:00", "endTime": "12:00" }, { "startTime": "13:00", "endTime": "17:00" }],
      "breaks": [{ "startTime": "12:00", "endTime": "13:00" }] }
  ]
}

// patients
{ "_id": "p1", "patientId": "PT10234567", "name": "John Doe", "mobile": "9876543210", "gender": "male" }

// appointments
{
  "_id": "a1", "patient": "p1", "doctor": "doc1", "department": "d1",
  "slotStart": "2025-01-15T09:15:00.000Z", "slotEnd": "2025-01-15T09:30:00.000Z",
  "status": "scheduled", "purpose": "Follow-up", "createdBy": "u3"
}
```

## Query optimization strategy

- **Appointment list** (search/filter/sort/pagination) uses a single MongoDB **aggregation pipeline** (`$match` on indexed fields → `$lookup` patient/doctor/department → `$sort` → `$facet` for items + total count) instead of N+1 populate calls, so filtering and the paginated count happen in one round trip.
- `.lean()` is used for read-only queries (doctor list, patient search, slot booking lookups) to skip Mongoose document hydration overhead.
- Only the fields actually needed are projected/selected where relevant (e.g. `slotStart status` when checking booked slots).
- `passwordHash` has `select: false` by default - it is never fetched unless explicitly requested (login flow), reducing both query payload and leak surface.
