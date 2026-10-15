# Enterprise EMR Appointment Management System

A production-oriented Appointment Management module for an Enterprise EMR system, built on the MERN stack (MongoDB Atlas, Express, React, Node.js) with JWT auth, RBAC, dynamic slot generation, concurrency-safe booking, and real-time updates via Socket.IO.

See also: [ENGINEERING_DECISIONS.md](ENGINEERING_DECISIONS.md), [docs/API.md](docs/API.md), [docs/DATABASE.md](docs/DATABASE.md).

## Project Overview

Three roles collaborate on one appointment workflow:

- **Super Admin** — onboards doctors/receptionists, configures doctor schedules, sees everything.
- **Receptionist** — searches/creates patients, books/updates/cancels appointments, marks patients arrived.
- **Doctor** — views only their own appointments and patient info.

Core flow: Super Admin configures a doctor's weekly working hours → slots are generated on demand from that configuration → a receptionist books a slot for an existing or new patient → the appointment moves through `scheduled → arrived → completed` (or `cancelled`) → every connected scheduler view updates live via WebSockets.

## Folder Structure

```
assessment/
├── backend/
│   ├── server.js                 # entry point: connects DB, starts HTTP + Socket.IO
│   └── src/
│       ├── config/                # env loading, DB connection, logger
│       ├── models/                # Mongoose schemas
│       ├── controllers/           # thin request/response layer
│       ├── services/               # business logic (booking, auth, slots, schedules)
│       ├── routes/                # Express routers
│       ├── middlewares/           # auth, RBAC, validation, error handling
│       ├── validators/            # Zod request schemas
│       ├── utils/                 # ApiError/ApiResponse, slot generator, constants
│       ├── sockets/                # Socket.IO setup + room-scoped event emitters
│       └── seed/                  # seed script (sample admin/doctors/departments)
├── frontend/
│   └── src/
│       ├── api/                   # axios client + per-resource API modules
│       ├── store/                 # Zustand (auth/client state only)
│       ├── hooks/                 # React Query hooks + Socket.IO hook
│       ├── components/
│       │   ├── layout/            # AppLayout, ProtectedRoute
│       │   ├── common/            # Button, FormField, Pagination, Spinner, ErrorBanner
│       │   ├── scheduler/         # SlotGrid, SchedulerFilters
│       │   └── appointments/      # AppointmentTable, PatientSearch, StatusBadge
│       ├── pages/                 # Login, Dashboard, Scheduler, BookAppointment, AppointmentList
│       └── routes/                # route definitions
├── docs/
│   ├── API.md
│   └── DATABASE.md
├── ENGINEERING_DECISIONS.md
└── README.md
```

## Architecture Overview

Layered on both sides:

- **Backend**: `routes → middlewares (auth/RBAC/validation) → controllers (thin) → services (business logic) → models`. A single `ApiResponse`/`ApiError` pair enforces the consistent `{ success, message, data, meta }` envelope and correct HTTP status codes everywhere; a centralized error middleware is the only place that turns any thrown error (including raw Mongo/Mongoose errors) into a client-safe response.
- **Frontend**: `api/* (HTTP) → hooks/* (React Query caching/invalidation) → components/* (presentation) → pages/* (composition)`. React Query owns all server state (doctors, slots, appointments, patients); Zustand holds only the authenticated user and access token — there is deliberately no duplicate "appointments" slice to keep in sync by hand.
- **Real-time**: Socket.IO clients authenticate the handshake with the same JWT access token, then join `doctor:<id>` / `department:<id>` rooms for the scheduler view they're looking at. Appointment create/update/cancel events are broadcast only into the relevant rooms, not globally.

Full rationale for these choices — including why services own business logic, why slots are generated rather than stored, and what changes at much larger scale — is in [ENGINEERING_DECISIONS.md](ENGINEERING_DECISIONS.md).

## Database Design

Summary: `User` (auth/identity) ↔ `Doctor` (clinical profile, 1:1) → `Department`; `Doctor` → `DoctorSchedule` (1:1, rules only — slots are computed on demand); `Appointment` references `Patient`, `Doctor`, `Department`, and the booking `User`. Double-booking is prevented by a partial unique index on `{ doctor, slotStart }`.

Full schema, indexes, sample documents, and query-optimization notes: [docs/DATABASE.md](docs/DATABASE.md).

## API Documentation

Full endpoint reference (request/response shapes, auth requirements, Socket.IO events): [docs/API.md](docs/API.md).

## Environment Variables

**Backend** (`backend/.env`, see `backend/.env.example`):

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | API port (default `5000`) |
| `API_PREFIX` | default `/api/v1` |
| `MONGO_URI` | **MongoDB Atlas** connection string (cloud) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | e.g. `15m` / `7d` |
| `CLIENT_ORIGIN` | frontend origin, for CORS + cookie scoping |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | API rate limiting |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | used only by the seed script |

**Frontend** (`frontend/.env`, see `frontend/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | e.g. `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | e.g. `http://localhost:5000` |

## Installation Instructions

Prerequisites: Node.js ≥ 18, a MongoDB Atlas cluster (connection string with a database user).

```bash
# Backend
cd backend
cp .env.example .env   # fill in MONGO_URI (Atlas) and JWT secrets
npm install

# Frontend
cd ../frontend
cp .env.example .env   # adjust if the API runs on a different host/port
npm install
```

## Running the Project

```bash
# 1) Seed baseline data (super admin, receptionist, 2 departments, 2 doctors with schedules)
cd backend
npm run seed

# 2) Start the API (http://localhost:5000)
npm run dev

# 3) In a second terminal, start the frontend (http://localhost:5173)
cd ../frontend
npm run dev
```

Seeded logins (also printed by the seed script's output and listed in `backend/.env.example` defaults):

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@emr.local` | `ChangeMe123!` |
| Receptionist | `receptionist@emr.local` | `ChangeMe123!` |
| Doctor (Cardiology) | `asha.rao@emr.local` | `ChangeMe123!` |
| Doctor (General Medicine) | `vikram.shah@emr.local` | `ChangeMe123!` |

Change these before using anything beyond local evaluation.

## Assumptions Made

- `DELETE /appointments/:id` is implemented as a **soft cancel** (status → `cancelled`), not a hard delete — medical/audit records must remain retrievable. See ENGINEERING_DECISIONS.md.
- A doctor's `DoctorSchedule` is a single active weekly configuration (not versioned/dated) — changing it affects all future slot generation immediately. Historical appointments are unaffected since their `slotStart`/`slotEnd` are already materialized.
- "Create Doctors / Create Receptionists" (RBAC requirement) is exposed as `POST /auth/staff/:role`, since the PDF's required-endpoints list didn't enumerate a specific path for it.
- Consultation notes may be edited by the treating doctor or a Super Admin (not by a receptionist).
- The refresh token is delivered as an httpOnly cookie (with a request-body fallback) rather than JSON, for XSS hardening — see ENGINEERING_DECISIONS.md §5.

## Known Limitations

- No automated test suite yet (unit tests for `slotGenerator.js` and the booking/concurrency path would be the first priority — see Future Improvements).
- `DoctorSchedule` supports one configuration per doctor; it doesn't yet support date-specific overrides (holidays, one-off hour changes).
- Department management (CRUD) isn't exposed via API — departments are currently seeded directly.
- No file/document attachments on appointments or patients.
- Docker setup is not included (optional per the assessment).

## Future Improvements

- Unit/integration tests (Jest + Supertest for the backend; React Testing Library for the frontend), especially around slot generation and the double-booking race.
- Date-specific schedule overrides (holidays, doctor leave) layered on top of the weekly pattern.
- Email/SMS reminders on booking and status changes.
- Redis-backed Socket.IO adapter for horizontal scaling (see ENGINEERING_DECISIONS.md §7).
- Dockerfiles + docker-compose for one-command local spin-up.
- OpenAPI/Swagger generation from the Zod validators for interactive API docs.
