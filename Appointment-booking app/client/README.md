# Appointment Booking — Client

[![Client unit tests](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml/badge.svg?job=client-unit-tests)](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml)
[![E2E tests](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml/badge.svg?job=e2e-tests)](https://github.com/GMSnowFlakes/appointment-booking-app/actions/workflows/ci.yml)
[![Node.js Versions](https://img.shields.io/badge/Node-18_%7C_20_%7C_22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)

React frontend for the appointment booking system. Built with React 19, Vite 8, Tailwind CSS 4, and Vitest.

> **Note:** Replace `YOUR-USERNAME` and `YOUR-REPO` in the badge URLs with your GitHub repository details.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [UI Components](#ui-components)
- [Project Structure](#project-structure)
- [Production Build](#production-build)

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest + @testing-library/react + jsdom |
| E2E | Playwright |
| Linting | ESLint |
| PWA | Service worker + manifest.json |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Make sure the API server is running on port 3001
#    (see ../server/README.md)

# 3. Start dev server (HMR enabled)
npm run dev
# → http://localhost:5173

# 4. Build for production
npm run build
# → outputs to dist/

# 5. Preview production build
npm run preview
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3001`.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_PAYPAL_CLIENT_ID` | ❌ | `''` | PayPal Client ID for checkout button. Get yours at [developer.paypal.com](https://developer.paypal.com/dashboard). Leave empty to hide PayPal. |

Create a `.env` file in this directory:
```bash
cp .env.example .env
# Edit .env with your PayPal Client ID (optional)
```

Vite requires client-side env vars to be prefixed with `VITE_`. See [Vite docs](https://vite.dev/guide/env-and-mode) for details.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:watch` | Watch mode — re-runs on changes |
| `npm run e2e` | E2E tests (Playwright, headless) |
| `npm run e2e:headed` | E2E tests (Playwright, visible browser) |

---

## Running Tests

### Unit Tests (Vitest)

```bash
npm test                          # Run all unit tests (~63 tests)
npm run test:watch                # Watch mode
npx vitest run --reporter=verbose # Verbose output
npx vitest run src/__tests__/AuthForm.test.jsx  # Single file
```

### E2E Tests (Playwright)

```bash
npm run e2e            # Headless mode
npm run e2e:headed     # Visible browser — useful for debugging
```

E2E tests require Docker PostgreSQL running on `localhost:5432`. From the project root:

```bash
cd ../..
docker compose up -d     # Start PostgreSQL
npm run e2e              # Run E2E tests
```

Each E2E run creates an isolated PostgreSQL schema (`e2e_<timestamp>`) so tests don't interfere with each other or dev data. The Playwright config auto-starts the API server and Vite dev server.

---

## Test Coverage

### Unit Tests (`src/__tests__/`) — 7 files, ~63 tests

| File | Tests | Coverage |
|------|-------|----------|
| `AppointmentList.test.jsx` | ~14 | Loading/empty/error states, cards, filter tabs, pagination, cancel dialog, reschedule modal |
| `AuthForm.test.jsx` | ~12 | Login/register forms, validation, loading, errors, mode toggle |
| `ServiceList.test.jsx` | ~12 | Cards, category grouping, search/filter, loading/error/empty states |
| `ConfirmDialog.test.jsx` | ~10 | Open/close, confirm/cancel, variants, ESC close, focus management |
| `ImportCsvModal.test.jsx` | ~6 | File upload, import flow, results, errors, template download |
| `useLoadingState.test.jsx` | ~3 | Hook state transitions, concurrent requests |

### E2E Tests (`e2e/`) — 3 spec files

| File | Coverage |
|------|----------|
| `auth.spec.js` | Login, registration, logout, session, validation |
| `booking.spec.js` | Service selection, date/time picking, booking, cancellation |
| `admin.spec.js` | Dashboard stats, service CRUD, user management, status changes |

### Test Patterns

Client unit tests use `@testing-library/react` with a simulated DOM (`jsdom`). API calls are mocked via `global.fetch`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should show loading state initially', () => {
  global.fetch.mockImplementation(() => new Promise(() => {}));
  render(<MyComponent />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

E2E tests use Playwright to interact with the UI like a real user. `seed-admin.cjs` creates a test admin account on the isolated PostgreSQL schema before tests start.

---

## UI Components

| Component | Description |
|-----------|-------------|
| `Navbar` | Sticky nav with logo, auth buttons, avatar, theme toggle, PWA install |
| `AuthForm` | Login/Register with validation, error display, mode toggle |
| `ServiceList` | Card grid by category with search, filter, loading/error/empty states |
| `BookingForm` | 3-step booking: service → date/time → notes |
| `AppointmentList` | Filtered cards with cancel, reschedule, iCal subscribe, CSV export |
| `CheckoutForm` | Stripe + PayPal payment with coupon code support |
| `AdminDashboard` | Full admin panel with 12+ tabs (services, staff, finance, analytics, etc.) |
| `ConfirmDialog` | Reusable modal (danger/warning/primary), ESC close, focus management |
| `AvailabilityCalendar` | Color-coded calendar (green/amber/red) |
| `AnalyticsDashboard` | Revenue, booking, customer metrics charts |
| `WaitingListManager` | Join/leave waiting list for busy slots |
| `RescheduleModal` | Modal for changing appointment date/time |
| `NotificationPreferences` | Email/SMS opt-in toggles |
| `ProfilePage` | Customer booking history |
| `PublicBookingTab` | White-label booking page settings |
| `WidgetsTab` | Embeddable iframe widget settings |
| `FinanceTab` | Tax, tips, dynamic pricing configuration |
| `DeveloperTab` | API key management & webhooks |
| `iCalManagerTab` | Calendar feed URL generation |
| `ScrollReveal` | Scroll-triggered CSS animation wrapper |
| `Skeleton` | Loading placeholder cards |

---

## Production Build

```bash
npm run build
# Output: dist/
```

The build is a static SPA. Serve it with any static file server:

- **Nginx:** Point root to `dist/` with fallback to `index.html` for SPA routing
- **Cloudflare Pages / Vercel / Netlify:** Upload `dist/` directly
- **Express:** Serve via `express.static()` from the API server
- **Railway / Render:** The build can be served as a static site

---

## Project Structure

```
client/
├── e2e/                    # Playwright E2E tests
│   ├── auth.spec.js
│   ├── booking.spec.js
│   ├── admin.spec.js
│   ├── helpers.js
│   └── playwright.config.js
├── src/
│   ├── main.jsx            # Entry point
│   ├── App.jsx             # Root component, state-based page routing
│   ├── index.css           # Tailwind + custom theme + animations
│   ├── context/
│   │   ├── AuthContext.jsx # Auth state, login/register/logout
│   │   ├── ThemeContext.jsx # Dark mode toggle
│   │   ├── ToastContext.jsx # Toast notifications
│   │   ├── PWAContext.jsx   # Service worker + install prompt
│   │   └── BusinessContext.jsx # Business settings
│   ├── components/          # 20+ UI components
│   ├── hooks/
│   │   └── useLoadingState.js
│   └── __tests__/           # Unit test files
├── public/
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── index.html
├── vite.config.js
├── vitest.config.js
├── eslint.config.js
├── .env.example
└── package.json
```
