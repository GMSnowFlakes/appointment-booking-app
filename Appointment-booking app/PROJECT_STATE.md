# Project State: Appointment Booking System

> **Generated:** June 12, 2026
> **Stack:** React 19 + Vite + Tailwind CSS 4 | Node.js + Express + PostgreSQL (pg)

---

## ✅ Completed Features

### 1. User Authentication
- **Registration** (`POST /api/auth/register`) — Name, email, password with bcrypt hashing
- **Login** (`POST /api/auth/login`) — JWT-based authentication (7-day expiry)
- **Role-based access** — `customer` / `admin` roles with middleware guard
- **Persistent sessions** via `localStorage` (token + user object)
- **Auth context** (`AuthContext.jsx`) — Provides `login`, `register`, `logout`, `fetchWithAuth` across the app
- **Protected routes** — Middleware (`authenticateToken`) validates JWT on all secured endpoints
- **UI** — Login/Register forms with validation, loading states, error display, toggle between modes

### 2. Services Catalog
- **Browse services** — Public endpoint returning active services grouped by category
- **Service detail** — Individual service lookup by ID
- **Search & filter** — Search by name/description, filter by category
- **Category grouping** — Services displayed under headings with configurable per-category colors
- **Service images** — Upload image per service (JPG, PNG, GIF, WebP, SVG, max 5MB)
- **Seed data** — 8 default services auto-seeded on first run
- **Admin CRUD** — Create, edit, soft-delete/restore services via Admin Dashboard
- **UI** — Card grid layout with loading/error/empty states, service cards show image, name, description, duration, price, category

### 3. Appointment Booking
- **3-step booking form** — (1) Select service, (2) Pick date/time, (3) Optional notes
- **Visual availability calendar** — Color-coded days (green=available, amber=limited, red=full)
- **Time slot selection** — 30-min intervals from 08:00–17:30, conflict-aware
- **Date validation** — Prevents past-date booking
- **Conflict detection** — Server-side overlap check using time arithmetic
- **Summary preview** — Live appointment summary shown after selections
- **UI** — Animated form steps, radio card selection, styled date/time pickers

### 4. Appointment Management
- **View appointments** — Card-based list with service name, date, time, duration, price, status badge, notes
- **Filter tabs** — All / Upcoming / Past with refresh button
- **Date range filter** — Filter appointments by custom date range
- **Pagination** — Paginated appointment list with page navigation
- **Cancellation** — Confirmation dialog before cancelling; prevents cancellation of past appointments
- **Rescheduling** — Modal with availability calendar to change date/time of existing appointments
- **Admin view** — `GET /api/appointments/all` returns appointments with user info (name, email)
- **UI** — Status badges (confirmed/cancelled/completed), cancel button, reschedule button, empty states per filter

### 5. Email Notifications (8 email types)
- **Booking confirmation** (`sendBookingConfirmation`) — Styled HTML email with appointment details and "View My Appointments" CTA
- **Cancellation notification** (`sendCancellationConfirmation`) — Cancellation confirmation with "Book a New Appointment" CTA
- **Reschedule confirmation** (`sendRescheduleConfirmation`) — Shows old date/time in red strikethrough → new date/time in green
- **Status change notification** (`sendStatusChangeConfirmation`) — Notifies customer when admin marks appointment complete/reopen
- **Reminder email** (`sendReminderEmail`) — Automated ~24h before appointment via background scheduler
- **Admin booking notification** (`sendAdminBookingNotification`) — Notifies all admins when a customer books, with customer details
- **Admin cancellation notification** (`sendAdminCancellationNotification`) — Notifies all admins when a customer cancels, showing the now-available slot
- **Admin reschedule notification** (`sendAdminRescheduleNotification`) — Notifies all admins when a customer reschedules, with old→new comparison
- **Resend integration** — Production-ready via `resend` npm package
- **Dev mode** — Logs formatted email output in ASCII box when no `RESEND_API_KEY` is set
- **Non-blocking** — All email sends are fire-and-forget (`.catch()` on promise)
- **Preference-aware** — All customer-facing emails respect the user's `email_reminders` opt-in/out setting

### 6. Reminder Scheduler
- **Background job** — `server/scheduler.js` runs on a configurable interval (default: every 5 min)
- **Configurable timing** — `REMINDER_HOURS_BEFORE` (default: 24h), `REMINDER_WINDOW_MINUTES` (default: 120min)
- **Idempotent** — Tracks sent reminders via `reminder_sent` column; doesn't re-send
- **Preference-aware** — Only sends to users with `email_reminders` enabled
- **Graceful** — Logs errors without crashing the scheduler loop; can disable via `DISABLE_SCHEDULER=true`

### 7. Notification Preferences
- **Toggle UI** — Accessible switch (`role="switch"`, `aria-checked`) on `/notifications` page
- **API** — `GET/PUT /api/user/preferences` for reading/updating preferences
- **Navbar tab** — Bell icon "Notifications" tab for authenticated users
- **Optimistic updates** — Toggle updates immediately with rollback on error
- **Info card** — Explains reminder timing and email address on file
- **Future-ready** — "SMS Notifications — Coming soon" placeholder

### 8. Admin Dashboard
- **4 tabs** — Settings, Services, Appointments, Users
- **Stats cards** — Business name, active services count, appointments count, users count
- **Settings** — Business name, type (35+ types), description, primary color, per-category colors
- **Services CRUD** — Table with image preview, edit modal, deactivate/restore
- **Appointments** — Status filter, pagination, mark complete/reopen inline
- **User management** — Role promotion/demotion, user deletion with cascading cleanup

### 9. UI/UX Design
- **Custom warm theme** — Indigo primary palette, serif headings (Playfair Display), sans-serif body (DM Sans)
- **Full dark mode** — CSS custom properties with `[data-theme="dark"]`, all colors inverted
- **PWA support** — Service worker registration + install prompt button
- **Animations** — `fadeIn`, `slideUp`, `scaleIn`, `slideDown` CSS keyframe animations; staggered card entries
- **Responsive** — Mobile-first with mobile bottom drawer nav on small screens
- **States** — Every component handles loading, empty, error, and edge cases
- **ConfirmDialog** — Reusable modal with danger/primary/warning variants, ESC key close, body scroll lock, focus management
- **Navbar** — Sticky top bar with logo, business type, navigation tabs, user avatar, theme toggle, PWA install, auth buttons
- **Footer** — App-wide footer with dynamic business name and branding

---
## 🗄️ Database — PostgreSQL

Migrated from SQLite (sql.js) to PostgreSQL (pg, node-postgres).

**Key benefits:**
- **Concurrent users** — Postgres handles 100+ simultaneous connections safely
- **No data corruption** — ACID-compliant even on crash
- **Connection pooling** — Reuses connections via `pg.Pool` (max 10)
- **Railway-ready** — Auto-connects via `DATABASE_URL` environment variable
- **Concurrent server instances** — Can scale to multiple server processes behind a load balancer

Six tables with foreign key relationships:

```sql
-- Users
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password        TEXT NOT NULL,          -- bcrypt hashed
  role            TEXT NOT NULL DEFAULT 'customer',  -- customer | admin
  email_reminders INTEGER DEFAULT 1,      -- opt-in for reminder emails
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  duration    INTEGER NOT NULL,          -- in minutes
  price       REAL NOT NULL,
  category    TEXT,                      -- e.g. Hair, Nails, Skincare
  is_active   INTEGER DEFAULT 1,         -- soft-delete flag
  image_url   TEXT DEFAULT NULL,         -- uploaded service image path
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  service_id    INTEGER NOT NULL REFERENCES services(id),
  date          TEXT NOT NULL,           -- YYYY-MM-DD
  time          TEXT NOT NULL,           -- HH:MM
  status        TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | cancelled | completed
  notes         TEXT,
  reminder_sent INTEGER DEFAULT 0,       -- 0 = not sent, 1 = sent
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Business Settings
CREATE TABLE business_settings (
  id                    SERIAL PRIMARY KEY,
  business_name         TEXT NOT NULL DEFAULT 'My Business',
  business_type         TEXT NOT NULL DEFAULT 'salon',
  business_description  TEXT DEFAULT '',
  primary_color         TEXT NOT NULL DEFAULT '#e11d48',
  category_colors       TEXT DEFAULT '{}',    -- JSON map of category → hex color
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Migrations Tracking (internal)
CREATE TABLE _migrations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMP DEFAULT NOW(),
  checksum    TEXT
);
```

### Seed Data (8 services)
| Service | Category | Duration | Price |
|---|---|---|---|
| Haircut & Styling | Hair | 45 min | $45.00 |
| Beard Trim & Shave | Grooming | 30 min | $30.00 |
| Hair Coloring | Hair | 90 min | $85.00 |
| Manicure | Nails | 45 min | $35.00 |
| Pedicure | Nails | 60 min | $45.00 |
| Facial Treatment | Skincare | 60 min | $65.00 |
| Massage Therapy | Wellness | 60 min | $75.00 |
| Makeup Application | Makeup | 60 min | $55.00 |

### Migrations (6 applied)
| # | Name | Description |
|---|------|-------------|
| 001 | `initial_schema` | Creates users, services, appointments tables |
| 002 | `add_role_column` | Adds `role` column to users |
| 003 | `add_business_settings` | Creates business_settings table, adds color/icon columns |
| 004 | `add_service_image` | Adds `image_url` column to services |
| 005 | `add_reminder_sent` | Adds `reminder_sent` column to appointments for reminder tracking |
| 006 | `add_email_reminders` | Adds `email_reminders` column to users for opt-in/out of emails |

---

## 🌐 API Endpoints

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user (name, email, password) |
| POST | `/api/auth/login` | ❌ | Login (email, password) → JWT |

### Services (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | ❌ | List all active services (grouped by category) |
| GET | `/api/services/:id` | ❌ | Get single service details |

### Appointments (Protected)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments` | ✅ | Get current user's appointments (paginated, filterable) |
| GET | `/api/appointments/all` | ✅ | Get all appointments (admin/staff view) |
| GET | `/api/appointments/availability` | ❌ | Get occupied time slots for a date range |
| POST | `/api/appointments` | ✅ | Create new appointment (service_id, date, time, notes) |
| PUT | `/api/appointments/:id/reschedule` | ✅ | Reschedule an appointment (new date, time) |
| PUT | `/api/appointments/:id/cancel` | ✅ | Cancel an appointment |

### Admin (Protected, Admin-only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/services` | List all services (including inactive) |
| POST | `/api/admin/services` | Create a new service (multipart: JSON + image) |
| PUT | `/api/admin/services/:id` | Update a service |
| DELETE | `/api/admin/services/:id` | Soft-deactivate a service |
| POST | `/api/admin/services/:id/restore` | Reactivate a deactivated service |
| GET | `/api/admin/appointments` | List all appointments (paginated, filterable by status/date) |
| PUT | `/api/admin/appointments/:id/status` | Update appointment status (confirm/complete/cancel) |
| GET | `/api/admin/users` | List all users with appointment counts |
| PUT | `/api/admin/users/:id/role` | Promote/demote user role |
| DELETE | `/api/admin/users/:id` | Delete user and their appointments |
| GET | `/api/admin/settings` | Get business settings |
| PUT | `/api/admin/settings` | Update business settings |

### User Preferences (Protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/preferences` | Get current user's notification preferences |
| PUT | `/api/user/preferences` | Update notification preferences (email_reminders boolean) |

### Services (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | ❌ | List active services (optional search & category filter) |
| GET | `/api/services/categories` | ❌ | List distinct service categories |
| GET | `/api/services/:id` | ❌ | Get single service details |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | ❌ | Health check (status, timestamp) |
| GET | `/api/settings` | ❌ | Public business settings (name, type, description, colors) |

---

## 📁 Folder Structure

```
Appointment-booking app/
├── PROJECT_MASTER.md                 # Project brief & rules
├── PROJECT_STATE.md                  # This file
│
├── client/                           # React + Vite frontend
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   ├── vite.config.js                # Vite config with /api proxy → :3001
│   ├── src/
│   │   ├── main.jsx                  # Entry point
│   │   ├── App.jsx                   # Root component, page routing via state
│   │   ├── index.css                 # Tailwind imports + custom theme + animations
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Auth state, login/register/logout/fetchWithAuth
│   │   └── components/
│   │       ├── Navbar.jsx            # Sticky nav, user avatar, auth buttons, mobile tabs
│   │       ├── AuthForm.jsx          # Login/Register form with validation & loading
│   │       ├── ServiceList.jsx       # Service cards grouped by category
│   │       ├── BookingForm.jsx       # 3-step booking flow (service → date/time → notes)
│   │       ├── AppointmentList.jsx   # Filtered appointment cards with cancel
│   │       └── ConfirmDialog.jsx     # Reusable modal dialog (danger/warning/primary)
│   └── dist/                         # Build output (gitignored)
│
├── server/                           # Node.js + Express backend
│   ├── index.js                      # Express app, middleware, routes, scheduler init
│   ├── db.js                         # PostgreSQL via pg, async query helpers (queryAll, queryOne, run)
│   ├── email.js                      # Email service — 8 notification types + dev mode logging
│   ├── scheduler.js                  # Background reminder scheduler (configurable interval)
│   ├── migrate.js                    # Migration runner + CLI (node migrate.js [--list])
│   ├── validation.js                 # Zod schemas for all endpoints
│   ├── errors.js                     # Standardized error codes + ApiError class
│   ├── logger.js                     # Pino structured logging (pretty + file in dev)
│   ├── rate-limit.js                 # Per-route rate limiting (express-rate-limit)
│   ├── cors.js                       # CORS configuration
│   ├── .env                          # Environment configuration
│   ├── .env.example                  # DATABASE_URL, JWT_SECRET, etc.
│   ├── nixpacks.toml                 # Railway deployment config
│   ├── package.json
│   ├── middlewares/
│   │   └── auth.js                   # JWT authentication + admin role middleware
│   ├── routes/
│   │   ├── auth.js                   # POST /register, POST /login
│   │   ├── services.js               # GET /services, /services/categories, /services/:id
│   │   ├── appointments.js           # Full CRUD + cancel + reschedule + admin notifications
│   │   ├── admin.js                  # Admin dashboard: services, appointments, users, settings
│   │   ├── settings.js               # Public GET /api/settings
│   │   └── preferences.js            # GET/PUT /api/user/preferences (notification prefs)
│   ├── migrations/                   # Sequential database migrations
│   │   ├── 001_initial_schema.js
│   │   ├── 002_add_role_column.js
│   │   ├── 003_add_business_settings.js
│   │   ├── 004_add_service_image.js
│   │   ├── 005_add_reminder_sent.js
│   │   └── 006_add_email_reminders.js
│   ├── __tests__/                    # Server unit tests (Vitest + supertest)
│   │   ├── auth.test.js
│   │   ├── services.test.js
│   │   ├── appointments.test.js
│   │   ├── admin.test.js
│   │   └── helpers.js
│   ├── uploads/                      # Uploaded service images
│   └── logs/                         # Application logs (app.log)
```

---

## 🎯 What Should Be Implemented Next

### High Priority
1. **Admin Dashboard** — Full CRUD for services (create/edit/delete), view all appointments, manage users
2. **Appointment Rescheduling** — Allow users to change date/time of existing appointments
3. **Date Availability Calendar** — Visual calendar view showing available vs. booked slots per day

### Medium Priority
4. **Automated Tests** — Unit tests for API endpoints + React component tests
5. **Input Validation Library** — Add `zod` or `joi` for structured request validation
6. **Pagination** — Paginate appointments list (currently returns all)
7. **Search & Filter** — Search services by name/category, filter appointments by date range

### Low Priority
8. **Dark Mode** — Theme toggle with persisted preference
9. **Email Template Editor** — Admin UI to customize email templates
10. **Notification Preferences** — Opt-in/out of email notifications per user
11. **Service Image Uploads** — Add images to services with file upload
12. **Internationalization (i18n)** — Multi-language support

### Completed Technical Debt
- ✅ **In-Memory SQL Mock (db-mock.js)** — Replaces PostgreSQL in unit tests for fast, isolated server testing. Handles all SQL patterns used by route handlers (SELECT, INSERT, UPDATE, DELETE, JOIN, WHERE with AND/OR/IN/ILIKE/IS NULL, ORDER BY, LIMIT/OFFSET, COUNT, SUM, COALESCE, DISTINCT, ON CONFLICT with explicit targets, `::type` casts, NOW()). See [Known Limitations](#known-mock-limitations) below.
- ✅ **Database Migrations** — Migration system with checksum-based tamper detection
- ✅ **Error Standardization** — Consistent error response format via `ApiError` class + `ErrorCodes` enum
- ✅ **Logging** — Structured logging via Pino (pretty-printed in dev, JSON in prod, file + console)
- ✅ **CORS Configuration** — Configurable via `CORS_ORIGINS` env var, sensible localhost defaults
- ✅ **Rate Limiting** — Per-route rate limiters (auth: 10/15min, public: 100/15min, appointments/admin: 60/15min)
- ✅ **Input Validation** — Zod schemas for all endpoints with reusable `validate()` helper
- ✅ **Environment Setup** — `.env.example` with all config vars documented
- ✅ **PostgreSQL Migration** — Switched from SQLite (sql.js) to PostgreSQL (pg) with connection pooling
- ✅ **E2E Test Infrastructure (PostgreSQL)** — Updated `seed-admin.cjs` from SQLite to PostgreSQL-compatible async API (`queryOne`, `$1` params). Playwright config uses unique `PG_SCHEMA` per run for test isolation with explicit `DATABASE_URL`. Removed all SQLite relics (`DB_PATH`, `.exec()`, file-based DB paths).
- ✅ **One-click Deploy** — Railway-ready via `nixpacks.toml` + `docker-compose.yml` for local Postgres

---

## 🧪 Test Infrastructure

### Server Unit Tests (Vitest + supertest)

The server uses an **in-memory SQL mock** (`server/db-mock.js`) instead of real PostgreSQL for unit tests. This makes tests fast (~4s for 100+ tests), isolated (no database setup needed), and deterministic (no shared state between test runs).

The mock intercepts calls to `db.queryAll()`, `db.queryOne()`, and `db.run()` and executes SQL against in-memory JavaScript arrays rather than PostgreSQL.

### Known Mock Limitations

Several PostgreSQL features are **not supported** by the mock. If a route handler's SQL uses these patterns, the mock will silently produce wrong results or throw errors. When writing new route handler tests, avoid relying on these patterns or add a direct unit test documenting the expected behavior difference.

| Pattern | Failure Mode | Used By Routes |
|---|---|---|
| `NULLS FIRST` / `NULLS LAST` in `ORDER BY` | Silently ignored | Booking rules |
| `ON CONFLICT DO NOTHING` without explicit target `(col)` | Cannot infer unique constraints — insert proceeds, creating duplicates | iCal tokens, integration settings, IP whitelist, customer tags, staff services |
| `GREATEST()` / `LEAST()` functions | Returns the raw SQL string as a value instead of evaluating it | Coupon decrement, loyalty points |
| `UNION` / `UNION ALL` | Enters `SELECT` handler and produces incorrect results through partial parsing | Booking rules |
| `DATE()` / `DATE_TRUNC()` / `INTERVAL` expressions | Return `undefined` instead of a date value | Walk-in tokens, analytics |
| `GROUP BY` with aggregation | Produces all rows without grouping | Analytics dashboard |
| `FROM (SELECT ...) AS sub` subquery | Not handled — produces empty or incorrect results | — |

Full details with `test.todo` entries: `server/__tests__/db-mock-aggregation.test.js → "Known mock limitations"`

Source-level documentation: `server/db-mock.js` header comment

### Test Coverage Areas

#### Server Unit Tests (`server/__tests__/`) — 8 test files, ~113 tests

| File | Tests | Coverage |
|------|-------|----------|
| `auth.test.js` | ~14 | Registration, login, JWT issuance, duplicate email rejection, password hashing, token edge cases |
| `services.test.js` | ~11 | List services, get by ID, search, category filter, active/inactive filtering, error handling |
| `appointments.test.js` | ~28 | Booking creation, conflict detection, cancellation, rescheduling, pagination, date filtering, authorization guards |
| `admin.test.js` | ~20 | Service CRUD, appointment management (status changes), user management (role changes, deletion), business settings |
| `notifications.test.js` | ~11 | Notification preferences (GET/PUT), email sending (booking confirm, cancel, reschedule, reminder, admin notifications) |
| `db-mock-aggregation.test.js` | ~29 | Direct mock tests: COUNT, SUM, COALESCE, DISTINCT, type-cast aliases, BETWEEN, LEFT JOIN, multiple aggregations, corner cases |

**How they work:** All server unit tests use the in-memory SQL mock (`db-mock.js`) — no PostgreSQL required. Fast (~4s for all 113 tests).

#### Client Unit Tests (`client/src/__tests__/`) — 7 test files, ~63 tests

| File | Tests | Coverage |
|------|-------|----------|
| `AppointmentList.test.jsx` | ~14 | Loading/empty/error states, appointment cards, filter tabs, pagination, cancel dialog, reschedule modal |
| `AuthForm.test.jsx` | ~12 | Login/register forms, validation, loading state, error display, mode toggle |
| `ServiceList.test.jsx` | ~12 | Service cards, category grouping, search/filter, loading/error/empty states |
| `ConfirmDialog.test.jsx` | ~10 | Open/close, confirm/cancel actions, danger/warning/primary variants, ESC close, focus management |
| `ImportCsvModal.test.jsx` | ~6 | File upload, import flow, results display, error handling, template download |
| `useLoadingState.test.jsx` | ~3 | Hook tests: loading state transitions, concurrent requests |

**How they work:** Vitest with `jsdom` environment. Components render in a simulated browser DOM. API calls are mocked.

#### E2E Tests (`client/e2e/`) — 3 spec files, Playwright

| File | Coverage |
|------|----------|
| `auth.spec.js` | Login, registration, logout, session persistence, form validation, error display |
| `booking.spec.js` | Service selection, date/time picking, booking creation, appointments list, cancellation |
| `admin.spec.js` | Dashboard stats, service management (create/edit/deactivate), user management, appointment status changes |

**How they work:** Playwright launches Chromium, auto-starts the API + Vite dev servers, and uses a unique PostgreSQL schema per run for isolation. See [`API test patterns`](#api-test-patterns) below.

---

### Workspace Commands (Run Everything from Root)

The root of `Appointment-booking app/` has a `package.json` with scripts that run both server and client tests via `npm --prefix`:

| Command | Where | What It Runs |
|---------|-------|-------------|
| `npm test` | root | Server tests, then client tests (sequential) |
| `npm run test:parallel` | root | Server + client tests concurrently |
| `npm run test:server` | root | Server tests only |
| `npm run test:client` | root | Client tests only |
| `npm run test:watch` | root | Server + client in watch mode (concurrently) |
| `npm run test:coverage` | root | Server tests with coverage

```bash
cd "Appointment-booking app"
npm test                    # 176+ tests in ~9s
npm run test:parallel       # Same tests, ~5s (parallel)
npm run test:server         # Just server (113+ tests)
npm run test:client         # Just client (63 tests)
npm run test:watch          # Watch mode
```

### Running Specific Test Categories

| Command | Where | What It Runs |
|---------|-------|-------------|
| `npm test` | `server/` | All server unit tests (Vitest) |
| `npm test` | `client/` | All client unit tests (Vitest) |
| `npm run e2e` | `client/` | E2E tests (Playwright, headless) |
| `npm run e2e:headed` | `client/` | E2E tests (Playwright, visible browser) |
| `npx vitest run __tests__/auth.test.js` | `server/` | Single server test file |
| `npx vitest run src/__tests__/AuthForm.test.jsx` | `client/` | Single client test file |
| `npx vitest --watch` | `server/` or `client/` | Watch mode — re-runs on file changes |
| `npx vitest run --reporter=verbose` | `server/` or `client/` | Verbose output showing each test name |
| `npx vitest run --coverage` | `server/` | Run with coverage report (saved to `coverage/`) |
| `npx playwright test --config e2e/playwright.config.js --grep "login"` | `client/` | Run E2E tests matching a pattern |

#### From the project root (one-command):

```bash
./start-test.sh                          # All server + client unit tests
./start-test.sh --file auth.test.js      # Single file
./start-test.sh --watch                  # Watch mode
./start-test.sh --coverage               # With coverage
```

The one-command runner starts Docker Postgres (if needed), installs deps, and runs the selected test suite.

### API Test Patterns

Server route tests use `supertest` to make HTTP requests against the Express app. The test setup (`vitest.setup.js`) replaces `db.js` with `db-mock.js` before each test file, ensuring test isolation.

```js
// Typical server test structure
import request from 'supertest';

describe('GET /api/services', () => {
  it('should list active services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.services).toBeDefined();
  });
});
```

Client component tests use `@testing-library/react` with mocked `fetch` calls. The AuthContext is wrapped in a test provider that supplies a fake user and `fetchWithAuth`.

E2E tests use Playwright to interact with the UI like a real user. The `seed-admin.cjs` script creates a test admin account, and tests run against a temporary PostgreSQL schema.

---

## 🚀 Running the Project

### Prerequisites
- Docker Desktop (for local PostgreSQL)
- Node.js 18+

### Quick Start (One Command)

```bash
cd "Appointment-booking app"
chmod +x start-dev.sh   # first time only
./start-dev.sh
```

**What it does:** Starts Docker Postgres → waits for it → installs deps → starts API server (auto-migrates) → starts Vite client → shows status dashboard.

Or from the server directory:
```bash
cd "Appointment-booking app/server"
npm run dev:up
```

### Quick Start (Manual)

If you prefer to run each service separately:

```bash
# Start PostgreSQL in Docker
docker compose up -d

# Terminal 1: Start the server
cd "Appointment-booking app/server"
cp .env.example .env          # Edit JWT_SECRET
npm install
npm run dev                   # → http://localhost:3001

# Terminal 2: Start the client
cd "Appointment-booking app/client"
npm install
npm run dev                   # → http://localhost:5173
```

The server auto-runs migrations and seeds default services on first start.
The Vite dev server proxies `/api` requests to `http://localhost:3001`.

### Railway Deployment

```bash
# 1. Push to GitHub
# 2. Go to railway.app → New Project → Deploy from GitHub repo
# 3. Add PostgreSQL database (+ New → Database → PostgreSQL)
# 4. Set env vars: JWT_SECRET, RESEND_API_KEY (optional), APP_URL
# 5. Done — Railway auto-injects DATABASE_URL into your app
```

### Running Tests

#### One-command test runner

```bash
cd "Appointment-booking app"
./start-test.sh                    # run all tests
./start-test.sh --watch            # watch mode
./start-test.sh --coverage         # with coverage report
./start-test.sh --file auth.test.js  # single test file
```

**What it does:** Starts Docker Postgres (if not running) → waits for it → installs deps → runs tests → shows pass/fail summary.

Or from the server directory:
```bash
cd "Appointment-booking app/server"
npm run test:up
```

#### Manual
```bash
# Ensure Docker Postgres is running first (docker compose up -d)
cd "Appointment-booking app/server"
npm test
npm test -- --coverage          # with coverage
npx vitest --watch              # watch mode
```

Tests use unique Postgres schemas per file (isolated, auto-cleaned).
Coverage reports (text, lcov, html) are generated via `@vitest/coverage-v8` and saved to `server/coverage/`.

#### E2E Tests (Playwright)

```bash
# Ensure Docker Postgres is running first (docker compose up -d)
cd "Appointment-booking app/client"
npm run e2e                    # headless mode
npm run e2e:headed             # with visible browser
```

**What it does:** Auto-starts the API server and Vite dev server. Each run creates an isolated Postgres schema (`e2e_<timestamp>`) so tests don't interfere with each other or dev data.
