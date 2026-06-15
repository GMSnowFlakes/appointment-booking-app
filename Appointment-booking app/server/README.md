# Appointment Booking — Server

Node.js + Express backend for the appointment booking system. Uses PostgreSQL for production and an in-memory SQL mock for fast unit tests.

[![Server unit tests](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml/badge.svg?job=server-unit-tests)](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml)
[![Node.js Versions](https://img.shields.io/badge/Node-18_%7C_20_%7C_22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)

> **Note:** Replace `YOUR-USERNAME` and `YOUR-REPO` in the badge URL with your actual GitHub repository details.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Project Structure](#project-structure)

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Runtime | Node.js 18+ (20 or 22 recommended) |
| Framework | Express 4 |
| Database | PostgreSQL 16 (via `pg` with connection pooling) |
| Validation | Zod 4 |
| Auth | JWT (`jsonwebtoken`, 7-day expiry) |
| Email | Resend (dev: console fallback with formatted output) |
| Payments | Stripe + PayPal |
| SMS | Twilio |
| Testing | Vitest + supertest |
| Coverage | `@vitest/coverage-v8` |
| Logging | Pino (pretty-print in dev, JSON in prod) |
| Security | Rate limiting, CORS whitelist, bcrypt password hashing |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Check configuration
cp .env.example .env
# Edit .env: set JWT_SECRET, DATABASE_URL

# 3. Start PostgreSQL (Docker)
docker compose -f ../docker-compose.yml up -d

# 4. Start dev server (auto-runs migrations, seeds data)
npm run dev
```

The API server starts on `http://localhost:3001`. On first run, it:
- Runs all pending database migrations
- Seeds 8 default services (Haircut, Manicure, Facial, etc.)
- Seeds default business settings
- Seeds demo user accounts
- Starts the reminder email scheduler

Verify it's running:
```bash
curl http://localhost:3001/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgres://postgres:postgres@localhost:5432/appointmentbook` | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | `change-this-to-a-random-secret-string` | Random 64+ char string for signing tokens |
| `APP_URL` | ❌ | `http://localhost:5173` | Public URL of your app (used in emails) |
| `PORT` | ❌ | `3001` | Server port |
| `RESEND_API_KEY` | ❌ | — | Transactional email sending (dev: console fallback) |
| `FROM_EMAIL` | ❌ | `noreply@appointmentbook.com` | Sender email address |
| `STRIPE_SECRET_KEY` | ❌ | — | Stripe payment processing |
| `VITE_PAYPAL_CLIENT_ID` | ❌ | — | PayPal checkout (set in client .env) |
| `GOOGLE_CLIENT_ID` | ❌ | — | Google Calendar sync |
| `GOOGLE_CLIENT_SECRET` | ❌ | — | Google Calendar sync |
| `ZOOM_CLIENT_ID` | ❌ | — | Zoom video meetings |
| `ZOOM_CLIENT_SECRET` | ❌ | — | Zoom video meetings |
| `TWILIO_ACCOUNT_SID` | ❌ | — | SMS notifications |
| `TWILIO_AUTH_TOKEN` | ❌ | — | SMS notifications |
| `TWILIO_PHONE_NUMBER` | ❌ | — | SMS sender number |
| `CORS_ORIGINS` | ❌ | Localhost dev ports | Comma-separated allowed origins |
| `DISABLE_SCHEDULER` | ❌ | `false` | Set `true` to disable reminder email scheduler |
| `NODE_ENV` | ❌ | `development` | Set to `production` for deployment |

> **Tip:** Generate a strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with file watching (`node --watch`) |
| `npm start` | Start production server |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm test -- --coverage` | Run tests with coverage report (text + lcov + html) |
| `npm run migrate` | Run pending database migrations |
| `npm run seed` | Seed default services & demo users |
| `npm run dev:up` | Shortcut to `../start-dev.sh` |
| `npm run test:up` | Shortcut to `../start-test.sh` |

---

## API Endpoints

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user (name, email, password) |
| POST | `/api/auth/login` | ❌ | Login → JWT token (7-day expiry) |

### Services (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | ❌ | List active services (search + category filter) |
| GET | `/api/services/categories` | ❌ | List distinct categories |
| GET | `/api/services/:id` | ❌ | Get single service details |

### Appointments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments` | ✅ | Current user's appointments (paginated, filterable) |
| GET | `/api/appointments/all` | ✅ | All appointments (admin/staff) |
| GET | `/api/appointments/availability` | ❌ | Occupied time slots for a date range |
| POST | `/api/appointments` | ✅ | Create appointment |
| PUT | `/api/appointments/:id/reschedule` | ✅ | Reschedule (date + time) |
| PUT | `/api/appointments/:id/cancel` | ✅ | Cancel appointment |

### Admin (Protected + Admin-only)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/services` | List (incl. inactive) / create service |
| PUT/DELETE | `/api/admin/services/:id` | Update / soft-deactivate |
| POST | `/api/admin/services/:id/restore` | Reactivate service |
| GET | `/api/admin/appointments` | All appointments (paginated, filterable) |
| PUT | `/api/admin/appointments/:id/status` | Update status (confirm/complete/cancel) |
| GET | `/api/admin/users` | List users with appointment counts |
| PUT | `/api/admin/users/:id/role` | Promote/demote user role |
| DELETE | `/api/admin/users/:id` | Delete user + cascade appointments |
| GET/PUT | `/api/admin/settings` | Business settings |

### User Preferences
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/user/preferences` | Notification preferences (email_reminders) |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | ❌ | Health check (status, timestamp) |
| GET | `/api/settings` | ❌ | Public business settings (name, type, colors) |

### Extended Features (25+ additional route files)

| Route File | Prefix | Features |
|------------|--------|----------|
| `payments.js` | `/api/payments` | Stripe/PayPal checkout, refunds, webhooks |
| `coupons.js` | `/api/coupons` | Discount codes, validation, application |
| `staff.js` | `/api/staff` | Staff profiles, availability |
| `waiting-list.js` | `/api/waiting-list` | Join, leave, notify |
| `video.js` | `/api/video` | Zoom/Meet link generation |
| `calendar-sync.js` | `/api/calendar` | Google Calendar OAuth + sync |
| `sms.js` | `/api/sms` | Twilio SMS sending |
| `profile.js` | `/api/profile` | Customer booking history |
| `analytics.js` | `/api/analytics` | Revenue, booking, customer metrics |
| `packages.js` | `/api/packages` | Multi-session bundle deals |
| `loyalty.js` | `/api/loyalty` | Points & rewards system |
| `gift-cards.js` | `/api/gift-cards` | Gift card purchase & redemption |
| `referrals.js` | `/api/referrals` | Referral tracking & rewards |
| `inventory.js` | `/api/inventory` | Product inventory management |
| `widget.js` | `/api/widget` | Embeddable booking widget |
| `public-booking.js` | `/api/public-booking` | White-label booking pages |
| `ical.js` | `/api/ical` | iCal feed generation |
| `finance.js` | `/api/finance` | Tax, tips, dynamic pricing |
| `export.js` | `/api/export` | CSV export |
| `import.js` | `/api/import` | CSV import |
| `webhooks.js` | `/api/webhooks` | Outgoing webhook dispatch |
| `tenants.js` | `/api/tenants` | Multi-tenancy management |

---

## Running Tests

```bash
npm test                          # All unit tests (~113 tests, ~4s)
npm test -- --coverage            # With coverage report
npm run test:watch                # Watch mode
npx vitest run --reporter=verbose # Verbose output
npx vitest run __tests__/auth.test.js  # Single file
```

From the project root:
```bash
cd ..
npm run test:server               # Server tests only
npm run test:parallel              # Server + Client concurrently
```

---

## Test Coverage

### Unit Tests (`__tests__/`) — 7 files, ~113 tests

All server unit tests use an **in-memory SQL mock** (`db-mock.js`) instead of real PostgreSQL. This makes tests fast (~4s for 113 tests), isolated (no database setup needed), and deterministic (no shared state between test runs).

| File | Tests | Coverage |
|------|-------|----------|
| `auth.test.js` | ~14 | Registration, login, JWT issuance, duplicate email, password hashing |
| `services.test.js` | ~11 | List, search, category filter, error handling |
| `appointments.test.js` | ~28 | Booking, conflicts, cancellation, rescheduling, pagination, auth guards |
| `admin.test.js` | ~20 | Service CRUD, status management, user management, settings |
| `notifications.test.js` | ~11 | Preferences, email sending (8 types) |
| `db-mock-aggregation.test.js` | ~29 | Direct mock tests: COUNT, SUM, JOIN, aggregations |

### How Tests Work

The mock intercepts calls to `db.queryAll()`, `db.queryOne()`, and `db.run()` and executes SQL against in-memory JavaScript arrays. The test setup (`vitest.setup.mjs`) replaces `db.js` with `db-mock.js` before each test file.

```js
import request from 'supertest';

describe('GET /api/services', () => {
  it('should list active services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.services).toBeDefined();
  });
});
```

### Known Mock Limitations

Several PostgreSQL features are **not supported** by the in-memory mock. See the full table in [`db-mock.js`](./db-mock.js) header or the [`PROJECT_STATE.md`](../PROJECT_STATE.md) for details.

| Pattern | Limitation |
|---------|------------|
| `NULLS FIRST` / `NULLS LAST` in ORDER BY | Silently ignored |
| `ON CONFLICT DO NOTHING` without explicit target | Creates duplicates |
| `GREATEST()` / `LEAST()` | Returns raw SQL string |
| `UNION` / `UNION ALL` | Incorrect results |
| `DATE()` / `DATE_TRUNC()` / `INTERVAL` | Returns undefined |
| `GROUP BY` with aggregation | Produces ungrouped rows |

---

## Project Structure

```
server/
├── index.js              # Express app entrypoint
├── db.js                 # PostgreSQL (pg) with query helpers
├── db-mock.js            # In-memory SQL mock for tests
├── email.js              # Email service (8 notification types)
├── scheduler.js          # Background reminder scheduler
├── migrate.js            # Database migration runner
├── validation.js         # Zod validation schemas
├── errors.js             # ApiError class + error codes
├── logger.js             # Pino structured logging
├── rate-limit.js         # Express-rate-limit config
├── cors.js               # CORS whitelist config
├── seed.js               # Data seeder
├── .env.example          # Environment variable template
├── middleware/
│   └── auth.js           # JWT verification + role guards
├── routes/               # 25+ route handler files
├── migrations/           # 26 versioned database migrations
├── __tests__/            # Vitest unit tests
├── uploads/              # Uploaded service images
└── coverage/             # Test coverage reports (gitignored)
```

---

## Production Notes

- **Process manager:** Use PM2 (`pm2 start index.js --name booking-api`) for production deployments
- **Database:** Ensure PostgreSQL 16+ with SSL enabled for cloud deployments
- **Static files:** In production, serve the client `dist/` via Nginx or use Express static middleware
- **Backups:** Configure automated PostgreSQL backups (Railway/Render provide this by default)
- **Monitoring:** Pino log output can be consumed by tools like Datadog, Logtail, or Papertrail
