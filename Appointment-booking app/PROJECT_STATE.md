# Project State: Appointment Booking System

> **Generated:** June 11, 2026
> **Stack:** React 19 + Vite + Tailwind CSS 4 | Node.js + Express + SQLite (sql.js)

---

## ✅ Completed Features

### 1. User Authentication
- **Registration** (`POST /api/auth/register`) — Name, email, password with bcrypt hashing
- **Login** (`POST /api/auth/login`) — JWT-based authentication (7-day expiry)
- **Persistent sessions** via `localStorage` (token + user object)
- **Auth context** (`AuthContext.jsx`) — Provides `login`, `register`, `logout`, `fetchWithAuth` across the app
- **Protected routes** — Middleware (`authenticateToken`) validates JWT on all secured endpoints
- **UI** — Login/Register forms with validation, loading states, error display, toggle between modes

### 2. Services Catalog
- **Browse services** — Public endpoint returning active services grouped by category
- **Service detail** — Individual service lookup by ID
- **Category grouping** — Services displayed under headings (Hair, Grooming, Nails, Skincare, Wellness, Makeup)
- **Seed data** — 8 default services auto-seeded on first run
- **UI** — Card grid layout with loading/error/empty states, service cards show name, description, duration, price, category

### 3. Appointment Booking
- **3-step booking form** — (1) Select service, (2) Pick date/time, (3) Optional notes
- **Time slot selection** — 30-min intervals from 08:00–17:30
- **Date validation** — Prevents past-date booking
- **Conflict detection** — Server-side overlap check using time arithmetic
- **Summary preview** — Live appointment summary shown after selections
- **UI** — Animated form steps, radio card selection, styled date/time pickers

### 4. Appointment Management
- **View appointments** — Card-based list with service name, date, time, duration, price, status badge, notes
- **Filter tabs** — All / Upcoming / Past with refresh button
- **Cancellation** — Confirmation dialog before cancelling; prevents cancellation of past appointments
- **Admin view** — `GET /api/appointments/all` returns appointments with user info (name, email)
- **UI** — Status badges (confirmed/cancelled/completed), cancel button, empty states per filter

### 5. Email Notifications
- **Booking confirmation email** — Styled HTML email with appointment details and CTA
- **Cancellation notification** — Cancellation confirmation with rebook CTA
- **Resend integration** — Production-ready via `resend` npm package
- **Dev mode** — Logs formatted email output to console when no `RESEND_API_KEY` is set
- **Non-blocking** — Email sends are fire-and-forget (`.catch()` on promise)

### 6. UI/UX Design
- **Custom theme** — Indigo primary palette, clean typography (Inter), consistent spacing
- **Animations** — `fadeIn`, `slideUp`, `scaleIn` CSS keyframe animations throughout
- **Responsive** — Mobile-first with responsive grid breakpoints (sm, lg)
- **States** — Every component handles loading, empty, error, and edge cases
- **ConfirmDialog** — Reusable modal with danger/primary/warning variants, ESC key close, body scroll lock, focus management
- **Navbar** — Sticky top bar with logo, navigation tabs, user avatar, auth buttons; mobile bottom tabs
- **Footer** — App-wide footer with branding

---

## 🗄️ Database Schema

Three tables with foreign key relationships:

```sql
-- Users
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,          -- bcrypt hashed
  created_at TEXT DEFAULT (datetime('now'))
);

-- Services
CREATE TABLE services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  duration    INTEGER NOT NULL,      -- in minutes
  price       REAL NOT NULL,
  category    TEXT,                  -- e.g. Hair, Nails, Skincare
  is_active   INTEGER DEFAULT 1,     -- soft-delete flag
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Appointments
CREATE TABLE appointments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,      -- FK → users.id
  service_id  INTEGER NOT NULL,      -- FK → services.id
  date        TEXT NOT NULL,         -- YYYY-MM-DD
  time        TEXT NOT NULL,         -- HH:MM
  status      TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | cancelled | completed
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
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
| GET | `/api/appointments` | ✅ | Get current user's appointments |
| GET | `/api/appointments/all` | ✅ | Get all appointments (admin/staff view) |
| POST | `/api/appointments` | ✅ | Create new appointment (service_id, date, time, notes) |
| PUT | `/api/appointments/:id/cancel` | ✅ | Cancel an appointment |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | ❌ | Health check (status, timestamp) |

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
│   ├── package.json
│   ├── .env.example
│   ├── index.js                      # Express app, middleware, routes, seed data
│   ├── db.js                         # SQLite via sql.js, query helpers, schema init
│   ├── email.js                      # Email service (Resend + dev mode logging)
│   ├── appointments.db               # SQLite database file
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js                   # POST /register, POST /login
│   │   ├── services.js               # GET /services, GET /services/:id
│   │   └── appointments.js           # CRUD + cancel for appointments
│   └── node_modules/                 # (gitignored)
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

### Technical Debt
13. **Environment Setup** — Add `.env` with actual `RESEND_API_KEY`, `JWT_SECRET`, `FROM_EMAIL`
14. **Error Standardization** — Consistent error response format across all endpoints
15. **Logging** — Add structured logging (e.g., `pino` or `winston`) instead of `console.log`
16. **CORS Configuration** — Restrict CORS to specific origins in production
17. **Rate Limiting** — Prevent abuse on auth endpoints
18. **Database Migrations** — Add migration system for schema changes

---

## 🚀 Running the Project

```bash
# Terminal 1: Start the server
cd "Appointment-booking app/server"
cp .env.example .env          # Configure env vars
npm install
npm run dev                   # → http://localhost:3001

# Terminal 2: Start the client
cd "Appointment-booking app/client"
npm install
npm run dev                   # → http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`.
