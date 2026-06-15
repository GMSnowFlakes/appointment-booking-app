# Changelog

All notable changes to the Appointment Booking System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-06-14

### Added

#### Core Booking
- User registration & login with JWT authentication
- Role-based access control (customer / admin)
- Service catalog with search, filter, and category grouping
- 3-step booking flow (service → date/time → notes)
- Visual availability calendar with color-coded day indicators
- 30-min time slot selection with conflict detection
- Appointment management (view, filter, paginate)
- Appointment cancellation with confirmation dialog
- Appointment rescheduling with availability check

#### Admin Dashboard
- Business settings (name, type, description, branding colors)
- Service CRUD (create, edit, soft-delete, restore) with image upload
- Appointment overview with status management (confirm, complete, cancel)
- User management (list, role promotion/demotion, delete)
- Analytics dashboard with key business metrics
- Staff management with schedules and availability
- Coupon/discount code management
- CSV import/export for services and appointments
- Finance tab with tax, tips, and dynamic pricing
- iCal calendar feed management
- Public booking page customization
- Embeddable booking widget configuration
- Developer tools & API key management

#### Payments
- Stripe payment integration (credit/debit cards)
- PayPal payment integration
- Deposit collection (partial payment upfront)
- Full refund processing
- Coupon/discount code support at checkout
- Payment history and invoice generation

#### Email Notifications
- Booking confirmation with appointment details
- Cancellation notification
- Reschedule confirmation (old→new comparison)
- Status change notification
- Automated reminder emails (~24h before appointment)
- Admin notifications for bookings, cancellations, reschedules
- Configurable opt-in/out per user
- Dev mode fallback (logs to console when no API key set)

#### Customer Features
- Booking history and profile page
- Notification preferences (email opt-in/out)
- Waiting list for fully booked slots
- iCal calendar subscription for appointments
- CSV export of appointments
- Loyalty points and rewards system
- Gift cards and referral system
- Package/bundle deals

#### Staff Management
- Staff member profiles with specialties
- Staff availability scheduling
- Leave management and shift scheduling
- Clock in/out tracking
- Staff portfolio and service assignment

#### Technical
- PostgreSQL database with connection pooling
- 26 database migrations with checksum verification
- Zod input validation on all endpoints
- Rate limiting (per-route configurable)
- Pino structured logging (file + console)
- Standardized error handling with ApiError class
- CORS configuration with whitelist support
- Multi-tenancy / SaaS mode support
- Google Calendar sync (OAuth)
- Zoom/Google Meet video conferencing links
- SMS notifications via Twilio
- Outgoing webhooks for integrations
- Embeddable booking widget (iframe)
- Public booking pages (white-label)
- In-memory SQL mock for unit tests

#### UI/UX
- Custom warm theme (indigo primary, serif headings)
- Full dark mode support with persisted preference
- Responsive mobile-first design
- PWA support with service worker + install prompt
- CSS animations (fadeIn, slideUp, scaleIn, slideDown)
- Loading skeletons for async content
- Toast notifications for user feedback
- Reusable confirm dialog component
- Scroll-triggered reveal animations

#### Testing
- 113+ server unit tests (Vitest + supertest)
- 63+ client component tests (@testing-library/react)
- 3 E2E test specs (Playwright with isolated Postgres schemas)
- In-memory SQL mock for fast, isolated server tests
- CI pipeline (GitHub Actions — 3 Node versions × 3 job types)
- ESLint configuration

#### Deployment
- Docker Compose for local PostgreSQL
- Railway-ready with nixpacks.toml
- Render.com one-click deploy support
- VPS deployment guide
- One-command dev startup script
- One-command test runner script
