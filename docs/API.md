# API Documentation

Base URL: `http://localhost:5000/api/v1`

All responses use a consistent envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {},
  "meta": null
}
```

On error, `success` is `false`, `data` is `null`, and `meta.details` may contain field-level validation errors. See [ENGINEERING_DECISIONS.md](../ENGINEERING_DECISIONS.md) for the list of HTTP status codes used.

Authenticated routes require `Authorization: Bearer <accessToken>`. The refresh token travels as an `httpOnly` cookie (`refreshToken`), scoped to `/api/v1/auth`, and is never exposed to JavaScript.

---

## Auth

### POST /auth/login
Public. Body: `{ "email": string, "password": string }`
Returns `{ accessToken, user }` and sets the `refreshToken` httpOnly cookie.

### POST /auth/refresh
Public (requires the `refreshToken` cookie, or `{ refreshToken }` in body as a fallback). Rotates the refresh token and returns a new `{ accessToken }`.

### POST /auth/logout
Protected. Revokes the current refresh token and clears the cookie.

### POST /auth/staff/:role
Protected, **Super Admin only**. `:role` is `doctor` or `receptionist`.
Body: `{ name, email, password, department?, specialization? }` (`department` required when `:role` is `doctor`).

---

## Doctors

### GET /doctors
Protected (any role). Query: `department?`, `search?`.
Returns the active doctor roster, used to populate scheduler/booking filters.

### GET /doctors/:doctorId/schedule
Protected (any role). Returns the doctor's weekly working-hours configuration.

### PUT /doctors/:doctorId/schedule
Protected, **Super Admin only**. Body:
```json
{
  "slotDurationMinutes": 15,
  "weeklySchedule": [
    { "dayOfWeek": 1, "isWorkingDay": true,
      "sessions": [{ "startTime": "09:00", "endTime": "12:00" }, { "startTime": "13:00", "endTime": "17:00" }],
      "breaks": [{ "startTime": "12:00", "endTime": "13:00" }] },
    ...  // all 7 days (0=Sunday..6=Saturday) must be present
  ]
}
```

---

## Slots

### GET /slots?doctor=<id>&date=YYYY-MM-DD
Protected. Dynamically generates that doctor's bookable slots for the given date from their schedule, flags each as `isBooked`, and excludes break periods and past times. Past dates return an empty, labeled result instead of an error.

---

## Patients

### GET /patients?search=&page=&limit=
Protected. Searches by name / mobile / patientId (server-side, paginated). Used by the "Existing Patient" booking flow.

---

## Appointments

### POST /appointments
Protected, **Super Admin / Receptionist**. Body:
```json
{
  "doctor": "<id>",
  "department": "<id>",
  "slotStart": "2025-01-15T09:15:00",
  "patientId": "<id>"            // OR:
  "newPatient": { "name": "...", "mobile": "...", "gender": "other", "address": "" },
  "purpose": "Follow-up"
}
```
Returns `409 Conflict` if the slot was just taken by someone else (see concurrency handling in ENGINEERING_DECISIONS.md).

### GET /appointments
Protected (any role; doctors are automatically restricted to their own appointments regardless of query params).
Query: `page, limit, sortBy, sortOrder, doctor, department, status, search (patient name/mobile/id), dateFrom, dateTo`.
Returns a paginated list with `meta.{page,limit,total,totalPages}`.

### GET /appointments/:id
Protected. Fetches a single appointment.

### PUT /appointments/:id
Protected. Body (all optional): `{ purpose, notes, consultationNotes, status, cancelReason }`.
Status changes are validated against the workflow `scheduled → arrived → completed`, or `scheduled|arrived → cancelled`. `consultationNotes` may only be set by the treating doctor or a Super Admin.

### DELETE /appointments/:id
Protected, **Super Admin / Receptionist**. Soft-deletes by transitioning the appointment to `cancelled` (medical records are never hard-deleted). Body: `{ cancelReason? }`.

### POST /appointments/:id/arrive
Protected, **Super Admin / Receptionist**. Shortcut for `PUT .../:id { status: "arrived" }`.

---

## Real-time events (Socket.IO)

Connect to the server root with `auth: { token: <accessToken> }`. After connecting, emit:
```js
socket.emit('scheduler:subscribe', { doctorId, departmentId });
```
The server then pushes these events to that doctor's/department's room only:

| Event | Payload | Fired on |
|---|---|---|
| `appointment:created` | populated Appointment | `POST /appointments` |
| `appointment:updated` | populated Appointment | `PUT /appointments/:id`, `POST /appointments/:id/arrive` |
| `appointment:cancelled` | populated Appointment | `DELETE /appointments/:id` |

See `backend/src/sockets/index.js` for the room-scoping implementation.
