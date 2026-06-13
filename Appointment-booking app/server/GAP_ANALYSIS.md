# Gap Analysis — 133+ Feature Audit

## Legend
- ✅ **BUILT** — Migration + route exist and are wired
- 🔶 **PARTIAL** — Table exists but route missing, or partially implemented
- ❌ **MISSING** — Not implemented at all
- 📋 **PLANNED** — Migration written this session, route not yet built

---

## Payments & Finance (Items 21-35)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 21 | Tax configuration per service | ❌ | No tax tables |
| 22 | Dynamic pricing (peak hours, weekends) | ❌ | No dynamic pricing tables |
| 23 | Early bird discounts | ❌ | No discount schedule tables |
| 24 | Last-minute deal slots | ❌ | No deal slot tables |
| 25 | Prepaid credit system | ❌ | No credit tables |
| 26 | Partial payment / pay later | 🔶 | Deposit columns exist, no structured partial payment |
| 27 | Gift cards | ✅ | Migration 017 + routes/gift-cards.js |
| 28 | Loyalty points / rewards | ✅ | Migration 017 + routes/loyalty.js |
| 29 | Referral system | ✅ | Migration 017 + routes/referrals.js |
| 30 | Apple Pay / Google Pay | 🔶 | Stripe handles this, no local wallet config |
| 31 | Buy now pay later (Klarna, Afterpay) | ❌ | No BNPL tables |
| 32 | Tip customization | 🔶 | tip_cents in invoices table |
| 33 | Staff commission tracking | ✅ | Migration 020 + analytics route |
| 34 | Invoice / receipt generation (PDF) | 🔶 | invoices table exists, no PDF gen route |
| 35 | Auto-invoice on completion | ❌ | No auto-invoice hook |

## Staff Management (Items 36-47)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 36 | Staff leave / time-off management | 🔶 | staff_exceptions exists, no structured leave requests |
| 37 | Buffer time before/after appointments | ❌ | No buffer config |
| 38 | Break time slots between appointments | ❌ | No break config |
| 39 | Staff clock-in / clock-out | ❌ | No clock tracking |
| 40 | Payroll calculation | ❌ | No payroll tables |
| 41 | Staff performance scorecard | ❌ | No scorecard tables |
| 42 | Shift scheduling | ❌ | No shift tables |
| 43 | Staff availability self-management portal | 🔶 | Admin can set, no staff self-service |
| 44 | Staff bio and certifications page | 🔶 | bio column exists, no certification tables |
| 45 | Portfolio/lookbook per staff | ❌ | No portfolio tables |
| 46 | Document storage per staff | ❌ | No document tables |
| 47 | Receptionist role (limited admin access) | ❌ | Only admin/customer roles |

## Customer Management (Items 48-60)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 48 | Guest checkout (no account required) | ❌ | Requires auth for all bookings |
| 49 | Social login (Google, Facebook) | ❌ | Only email/password auth |
| 50 | VIP customer tagging | 🔶 | tags column in customer_profiles exists |
| 51 | Priority booking for VIP customers | ❌ | No priority logic |
| 52 | Customer blacklist / block list | ❌ | No blacklist table |
| 53 | Customer notes per appointment | 🔶 | notes column in appointments |
| 54 | Customer lifetime value tracking | 🔶 | total_spent_cents in customer_profiles |
| 55 | Rescheduling limit per customer | ❌ | No limits tracking |
| 56 | Maximum bookings per customer per day | ❌ | No booking limits |
| 57 | Re-engagement email campaigns | ❌ | No campaign system |
| 58 | Abandoned booking recovery emails | ❌ | No recovery system |
| 59 | NPS survey post-appointment | ❌ | No survey system |
| 60 | Reviews and ratings per service | ✅ | Migration 010 + reviews table |

## Scheduling Rules (Items 61-75)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 61 | Minimum advance booking window | ❌ | No window config |
| 62 | Maximum advance booking window | ❌ | No window config |
| 63 | Same-day booking toggle | ❌ | No toggle |
| 64 | Cancellation window policy | ✅ | cancellation_policies in migration 019 |
| 65 | Service-specific booking rules | ❌ | No per-service rules |
| 66 | Minimum gap between same service rebooking | ❌ | No gap rule |
| 67 | Group bookings | ❌ | No group tables |
| 68 | Class/event bookings (one slot, many attendees) | ❌ | No class tables |
| 69 | Couple/duo booking | ❌ | No duo tables |
| 70 | Walk-in appointment support | ❌ | No walk-in support |
| 71 | Overbooking buffer management | ❌ | No buffer config |
| 72-75 | Calendar views / drag-drop / bulk actions | ❌ | Frontend features |

## Notifications & Communication (Items 76-84)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 76 | WhatsApp notifications | ❌ | No WhatsApp integration |
| 77 | Push notifications (web + mobile) | ❌ | No push system |
| 78 | In-app messaging (customer ↔ staff) | ❌ | No messaging system |
| 79 | Custom email templates (branding) | ❌ | No template system |
| 80 | Abandoned booking recovery | ❌ | No recovery system |
| 81 | Post-appointment product recommendation | ❌ | No recommendation engine |
| 82 | Automated upsell email | ❌ | No upsell system |
| 83 | Next appointment auto-suggestion | ❌ | No suggestion system |
| 84 | Predictive rebooking | ❌ | No prediction |

## Analytics & Reporting (Items 85-95)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 85 | Analytics dashboard | ✅ | AnalyticsDashboard component + route |
| 86 | Booking source tracking | ❌ | No source tracking |
| 87 | Heatmap of busiest booking times | ❌ | No heatmap data |
| 88 | Churn / no-return customer alerts | ❌ | No churn analysis |
| 89 | Profit/loss report per staff | ❌ | No P&L data |
| 90 | Expense tracking per service | ❌ | No expense tables |
| 91 | Facebook Pixel integration | ❌ | No pixel config |
| 92 | Google Analytics integration | ❌ | No GA config |
| 93 | Export all data to CSV/Excel | ❌ | No export endpoints |
| 94 | Import customers via CSV | ❌ | No import system |
| 95 | Print daily appointment sheet | ❌ | No print endpoint |

## Admin & Security (Items 96-105)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 96 | Two-factor authentication (2FA) | ❌ | No 2FA |
| 97 | Audit log | ❌ | analytics_events exists but not full audit |
| 98 | Role permissions customization | 🔶 | admin/customer roles only |
| 99 | Session management (view + revoke) | ❌ | No session tracking |
| 100 | Login history per user | ❌ | No login log |
| 101 | Auto-logout on inactivity | ❌ | No idle timeout |
| 102 | Data backup + restore | ❌ | No backup system |
| 103 | IP whitelist for admin panel | ❌ | No IP restrictions |
| 104 | White-label mode | ❌ | No white-label |
| 105 | Maintenance mode page | ❌ | No maintenance mode |

## Front Desk / Kiosk (Items 106-110)

All ❌ — Kiosk mode, digital waitlist display, front desk dashboard, token system, wait time display

## Integrations (Items 111-117)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 111 | Google Calendar sync | ✅ | Migration 012 + routes/calendar-sync.js |
| 112 | iCal export | ❌ | No iCal endpoint |
| 113 | Zapier / Make integration | ❌ | No webhook automation |
| 114 | API access for developers | ❌ | No API keys |
| 115 | Public booking page (shareable link) | ❌ | No public booking page |
| 116 | POS integration (Square, Clover) | ❌ | No POS integration |
| 117 | Webhook support | ✅ | Migration 021 + routes/webhooks.js |

## AI Features (Items 118-125)

All ❌ — No AI prediction, forecasting, recommendations, etc.

## Compliance & Accessibility (Items 126-133)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 126 | GDPR / data export request | ❌ | No GDPR endpoints |
| 127 | Right to erasure | ❌ | No erasure endpoint |
| 128 | Cookie consent banner | ❌ | No cookie config |
| 129 | WCAG accessibility compliance | ❌ | Frontend concern |
| 130 | Multi-language support (i18n) | ❌ | No i18n |
| 131 | Multi-currency support | ❌ | USD only |
| 132 | Timezone auto-detection | ❌ | No timezone handling |
| 133 | Global DST handling | ❌ | No DST handling |

---

## Summary

| Category | Total | ✅ Built | 🔶 Partial | ❌ Missing |
|----------|-------|----------|------------|-----------|
| Payments & Finance | 15 | 3 | 3 | 9 |
| Staff Management | 12 | 0 | 5 | 7 |
| Customer Management | 13 | 1 | 5 | 7 |
| Scheduling Rules | 15 | 1 | 0 | 14 |
| Notifications | 9 | 0 | 0 | 9 |
| Analytics & Reporting | 11 | 1 | 0 | 10 |
| Admin & Security | 10 | 0 | 1 | 9 |
| Front Desk / Kiosk | 5 | 0 | 0 | 5 |
| Integrations | 7 | 2 | 0 | 5 |
| AI Features | 8 | 0 | 0 | 8 |
| Compliance | 8 | 0 | 0 | 8 |
| **TOTAL** | **133+** | **8** | **14** | **111** |
