# Implementation Plan: 10 New Features

> **Started:** June 13, 2026
> **Stack:** Node.js + Express + PostgreSQL + React + Vite + Tailwind CSS

---

## Feature Dependency Order

```
1. Database Migrations (all new tables) ───────────────────────────┐
2. Customer Profile Page (independent)                              │
3. Payment System (Stripe + PayPal) ───┐                            │
4. Coupons / Discount Codes ───────────┤─── depends on payments    │
5. Deposits + Refunds ─────────────────┘                            │
6. Staff Management + Schedules (independent)                       │
7. Waiting List (depends on appointments)                           │
8. Zoom/Google Meet Links (depends on appointments)                 │
9. Google Calendar Sync (depends on appointments)                   │
10. SMS Notifications (Twilio) (independent)                        │
11. Multi-tenancy / SaaS Mode (architectural, depends on all) ──────┘
```

---

## Files Created/Modified

### Database (migrations)
| File | Purpose |
|------|---------|
| `007_add_payments.sql` | payment_intents, refunds, coupons tables |
| `008_add_staff.sql` | staff_members, staff_availability, staff_appointments |
| `009_add_waiting_list.sql` | waiting_list table |
| `010_add_customer_profiles.sql` | profiles, booking_history view |
| `011_add_video_conferencing.sql` | video_meetings table |
| `012_add_calendar_sync.sql` | calendar_tokens, calendar_events |
| `013_add_multi_tenancy.sql` | tenants table, tenant_id columns |

### Server (new routes)
| File | Purpose |
|------|---------|
| `routes/payments.js` | Stripe/PayPal checkout, webhooks, refunds |
| `routes/coupons.js` | CRUD + validation for discount codes |
| `routes/staff.js` | Staff CRUD, availability management |
| `routes/waiting-list.js` | Join/leave/notify waiting list |
| `routes/calendar-sync.js` | Google Calendar OAuth + sync |
| `routes/video.js` | Zoom/Meet link generation |
| `routes/sms.js` | Twilio SMS sending |
| `routes/profile.js` | Customer booking history |
| `routes/tenants.js` | Tenant management |

### Client (new components)
| File | Purpose |
|------|---------|
| `components/CheckoutForm.jsx` | Stripe/PayPal payment UI |
| `components/StaffManager.jsx` | Admin staff CRUD |
| `components/StaffSchedule.jsx` | Staff availability calendar |
| `components/ProfilePage.jsx` | Customer booking history |
| `components/WaitingList.jsx` | Join waiting list UI |
| `components/CouponManager.jsx` | Admin coupon CRUD |
| `components/CouponInput.jsx` | Apply coupon at checkout |
| `components/VideoMeeting.jsx` | Zoom/Meet link display |
| `components/SmsPreferences.jsx` | SMS opt-in settings |
| `components/TenantSelector.jsx` | Business switcher |
| `components/CalendarSync.jsx` | Google Calendar connect |

---

## Progress Tracking

- [ ] 01. Database migrations (all tables)
- [ ] 02. Customer profile page
- [ ] 03. Stripe + PayPal payments (server)
- [ ] 04. Stripe + PayPal payments (client)
- [ ] 05. Deposit collection + refunds
- [ ] 06. Coupons / discount codes (server + client)
- [ ] 07. Staff management + schedules (server)
- [ ] 08. Staff management + schedules (client)
- [ ] 09. Waiting list (server + client)
- [ ] 10. Zoom / Google Meet links (server + client)
- [ ] 11. Google Calendar sync (server + client)
- [ ] 12. SMS notifications Twilio (server + client)
- [ ] 13. Multi-tenancy / SaaS mode
