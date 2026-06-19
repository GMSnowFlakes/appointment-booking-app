# CRAMS ServiceHub — Design Strategy & Implementation Blueprint

> **Version:** 1.0  
> **Date:** June 2026  
> **Product:** CRAMS ServiceHub — The modern operating system for appointment-based businesses.

---

## 1. Complete UX Audit of Existing Screenshots

### Current State Assessment

| Dimension | Finding | Severity |
|-----------|---------|----------|
| **Navigation** | Crowded top bar with 12+ admin tabs creates cognitive overload | 🔴 High |
| **Dashboard** | Raw stats without context — no trends, no actionable insights | 🔴 High |
| **Information Hierarchy** | All admin features at same level (Appointments = Widgets = Developer) | 🔴 High |
| **Visual Hierarchy** | Insufficient differentiation between primary/secondary/tertiary info | 🟡 Medium |
| **Typography** | Serif headings clash with modern SaaS expectations | 🟡 Medium |
| **Color System** | Single primary color (#e11d48) without semantic color hierarchy | 🟡 Medium |
| **Card Design** | Consistent but lacks elevation depth — all cards look flat | 🟢 Low |
| **Form Design** | Functional but not premium — lacks floating labels, inline validation | 🟡 Medium |
| **Empty States** | Present but generic — missing helpful CTAs | 🟢 Low |
| **Motion** | Basic fade-in animations — missing micro-interactions | 🟡 Medium |
| **Dark Mode** | Implemented but too dark, text contrast issues | 🔴 High |
| **Mobile** | Responsive but not intentionally designed for mobile | 🟡 Medium |

### Key UX Problems to Solve

1. **"Everything is equally important"** — The admin sidebar lists Story, Settings, Staff, Services, Finance, Developer, Calendar, Public Pages, Widgets, Coupons, Analytics, Appointments, Users all at the same level. A salon owner doesn't need Developer tools in the primary nav.

2. **"Stats without story"** — The dashboard shows "6 active services, 18 appointments, 4 staff" but doesn't tell the business owner whether that's good, bad, or trending.

3. **"No action center"** — There's no central place for urgent items (pending confirmations, cancellations, waitlist notifications).

---

## 2. Revised Information Architecture

### New Navigation Hierarchy

```
┌─────────────────────────────────────┐
│  ┌───┐                              │
│  │ C │  CRAMS ServiceHub            │
│  └───┘  [Business Name]             │
│                                     │
│  OVERVIEW                           │
│  ├── Dashboard                      │
│  ├── Today's Schedule               │
│  └── Calendar                       │
│                                     │
│  OPERATIONS                         │
│  ├── Appointments                   │
│  ├── Customers                      │
│  ├── Services                       │
│  └── Staff                          │
│                                     │
│  GROWTH                             │
│  ├── Analytics & Reports            │
│  ├── Promotions & Coupons           │
│  ├── Public Booking Pages           │
│  └── Widgets & Embeds               │
│                                     │
│  SETTINGS                           │
│  ├── Business Settings              │
│  ├── Notifications                  │
│  ├── Integrations & API             │
│  └── Security                       │
│                                     │
│  [User Avatar]  [Theme] [Logout]    │
└─────────────────────────────────────┘
```

### Grouped Settings Structure

**BUSINESS**
- General (Business name, type, description, colors)
- Branding (Logo, favicon, social links)
- Locations & Hours
- Taxes

**OPERATIONS**
- Staff Settings
- Service Categories
- Booking Rules (calendar rules, waiting list rules, cancellation policies)
- Notification Templates

**GROWTH**
- Promotions (coupons, early bird, last-minute)
- Public Pages (SEO, shareable links)
- Widgets & Embeds

**ADVANCED**
- Integrations (Google Calendar, iCal, Zoom)
- API Keys & Webhooks
- Audit Log
- Security (2FA, sessions)

---

## 3. Dashboard Redesign Blueprint

### Metrics Layout — Actionable Intelligence Grid

```
┌──────────────────────────────────────────────────────────────────┐
│  Good morning, [Name]                                           │
│  You have [N] appointments today · Revenue is [trend]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Today's      │  │ Revenue      │  │ New Clients  │           │
│  │ Appointments │  │ This Month   │  │ This Week    │           │
│  │     18       │  │   $4,280     │  │     12       │           │
│  │ ↑ 12% vs     │  │ ↑ 8% vs      │  │ ↑ 20% vs     │           │
│  │ last week    │  │ last month   │  │ last week    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Staff Util.  │  │ Booking Conv.│  │ Cancellation │           │
│  │     76%      │  │    62%       │  │     4%       │           │
│  │ ↑ 3% vs      │  │ ↓ 2% vs      │  │ ↓ 1% vs      │           │
│  │ last month   │  │ last month   │  │ last month   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ ACTION CENTER                                           │     │
│  │                                                         │     │
│  │ ● 3 appointments require confirmation        [Review]   │     │
│  │ ● 2 staff schedules require approval         [Approve]  │     │
│  │ ● 5 customers on waiting list                [View]     │     │
│  │ ● Revenue target 82% achieved                           │     │
│  │                                                         │     │
│  │ Quick Actions: [Create] [Promotion] [Calendar] [Staff]  │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐      │
│  │ Daily Revenue Trend  │  │ Smart Insight                │      │
│  │ [SVG Chart]          │  │                                │      │
│  │                      │  │ "Wednesday afternoons         │      │
│  │                      │  │  consistently underperform.   │      │
│  │                      │  │  Would you like to create     │      │
│  │                      │  │  a promotion?"     [Create]   │      │
│  └──────────────────────┘  └──────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Smart Insights Engine

| Insight | Trigger | Action |
|---------|---------|--------|
| "Wednesday afternoons underperform" | Low booking data for specific time slots | Suggest promotion |
| "SMS reminders could reduce cancellations by 12%" | Cancellation rate > 5% | Recommend SMS setup |
| "Haircut is your top service this month" | Booking data analysis | Suggest bundle or package |
| "Waitlist: 5 customers waiting for Massage" | Waitlist entries > 0 | Quick action to open slots |
| "Your best staff member this week: Sarah" | Staff performance data | Show recognition badge |

---

## 4. Action Center Design

### Component Structure

```tsx
<ActionCenter>
  <ActionItem
    severity="high"      // high | medium | low
    icon="calendar"
    message="3 appointments require confirmation"
    action={{ label: "Review", href: "#appointments" }}
  />
  <ActionItem
    severity="medium"
    icon="clock"
    message="2 staff schedules pending approval"
    action={{ label: "Approve", href: "#staff" }}
  />
</ActionCenter>
```

### Visual Design

- High severity: Red/orange dot + bold text
- Medium severity: Yellow/amber dot
- Low severity: Blue/gray dot
- Each item: Icon + message + CTA button
- Collapsible section with count badge
- Empty state: "All caught up! 🎉" with subtle illustration

---

## 5. Business Settings Redesign

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┬────────────────────────────────────────┐       │
│  │ BUSINESS │  General                                │       │
│  │  General │  ┌──────────────────────────────────┐   │       │
│  │ Branding │  │ Business Name   [________________]│   │       │
│  │ Locations│  │ Business Type   [________________]│   │       │
│  │ Taxes    │  │ Description     [________________]│   │       │
│  │          │  │ Primary Color   [■■■■■]           │   │       │
│  ├──────────┤  └──────────────────────────────────┘   │       │
│  │OPERATIONS│                                          │       │
│  │ Staff    │  Branding (selected)                     │       │
│  │ Services │  ┌──────────────────────────────────┐   │       │
│  │ Calendar │  │ Logo Upload    [📁 Drop image]   │   │       │
│  │ Waitlist │  │ Favicon        [📁 Upload]       │   │       │
│  ├──────────┤  │ Social Links   [________________]│   │       │
│  │ GROWTH   │  └──────────────────────────────────┘   │       │
│  │Promotions│                                          │       │
│  │Public    │                                          │       │
│  │Widgets   │                                          │       │
│  ├──────────┤                                          │       │
│  │ADVANCED  │                                          │       │
│  │Integrate │                                          │       │
│  │ API Keys │                                          │       │
│  │ Security │                                          │       │
│  └──────────┴──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Form Design Principles

- **Floating labels** on focus
- **Inline validation** with real-time feedback
- **Helper text** below each field
- **Smart defaults** pre-filled
- **Progressive disclosure** — advanced options hidden behind "Show more"
- **Section dividers** with subtle spacing
- **Preview panel** for changes (e.g., see color change in real-time)

---

## 6. Light Mode Specifications

### Color Palette

```
Background:                    #F8FAFC (slate-50)
Surface (cards, sidebar):      #FFFFFF
Surface Hover:                 #F1F5F9 (slate-100)
Surface Elevated (modals):     #FFFFFF

Primary:                       #E11D48 (crams-primary)
Primary Hover:                 #BE123C
Primary Light:                 #FFF1F2
Primary Subtle:                rgba(225, 29, 72, 0.08)

Text Primary:                  #0F172A (slate-900)
Text Secondary:                #475569 (slate-600)
Text Muted:                    #94A3B8 (slate-400)

Border Default:                #E2E8F0 (slate-200)
Border Strong:                 #CBD5E1 (slate-300)

Success:                       #16A34A
Warning:                       #D97706
Error:                         #DC2626
Info:                          #0284C7

Shadow xs:                     0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)
Shadow sm:                     0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)
Shadow md:                     0 4px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.03)
Shadow lg:                     0 12px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)
```

### Visual Tone

"Calm, premium, professional — like Linear crossed with Stripe."

- Clean whitespace with generous padding
- Subtle elevation through shadows, not heavy borders
- Primary color used sparingly for CTAs and active states
- Restrained accent — one accent color per section

---

## 7. Dark Mode Specifications

### Color Palette

```
Background:                    #0B0F19 (deeper than surface)
Surface (sidebar):             #111827 (gray-900)
Surface (cards):               #1E293B (slate-800)
Surface Hover:                 #334155 (slate-700)

Primary:                       #FB7185 (pink-400)
Primary Hover:                 #FDA4AF
Primary Subtle:                rgba(251, 113, 133, 0.1)

Text Primary:                  #F8FAFC (slate-50)
Text Secondary:                #94A3B8 (slate-400)
Text Muted:                    #64748B (slate-500)

Border Default:                rgba(255,255,255,0.08)
Border Strong:                 rgba(255,255,255,0.14)

Shadows:                       Based on black with higher opacity
```

### Visual Tone

"Elegant dark mode like Raycast meets Linear."

- Layered depth through surface colors, not opacity
- Sidebar darker than content area
- Cards slightly lighter than background
- Borders are translucent white, not solid colors
- Text has comfortable contrast (minimum 4.5:1)
- Primary is lighter/pinker than light mode (FB7185 vs E11D48)

---

## 8. Full Design System Documentation

### Naming Conventions

```
--color-{role}-{variant}

Roles:    surface, border, text, primary, success, error, warning, info
Variants: default, alt, raised, warm, strong, muted

Examples:
--color-surface          (default card surface)
--color-surface-alt      (hover/subtle background)  
--color-surface-raised   (modal/dropdown surface)
--color-border           (default border)
--color-border-strong    (emphasized border)
--color-text             (primary text)
--color-text-secondary   (body text)
--color-text-muted       (labels, placeholders)
```

### Spacing Scale

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### Border Radius Scale

```
--radius-sm:    6px
--radius-md:    8px
--radius-lg:    12px
--radius-xl:    16px
--radius-2xl:   20px
--radius-full:  9999px
```

---

## 9. Color Token Definitions

```css
/* ─── Light Mode ──────────────────────────── */
:root {
  --color-primary: #e11d48;
  --color-primary-hover: #be123c;
  --color-primary-light: #fff1f2;
  --color-primary-subtle: rgba(225, 29, 72, 0.08);
  --color-primary-border: rgba(225, 29, 72, 0.2);
  
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-alt: #f1f5f9;
  --color-surface-raised: #ffffff;
  --color-surface-overlay: rgba(15, 23, 42, 0.4);
  
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #ffffff;
  
  --color-success: #16a34a;
  --color-success-bg: #f0fdf4;
  --color-success-border: rgba(22, 163, 74, 0.2);
  --color-warning: #d97706;
  --color-warning-bg: #fffbeb;
  --color-warning-border: rgba(217, 119, 6, 0.2);
  --color-error: #dc2626;
  --color-error-bg: #fef2f2;
  --color-error-border: rgba(220, 38, 38, 0.2);
  --color-info: #0284c7;
  --color-info-bg: #f0f9ff;
  --color-info-border: rgba(2, 132, 199, 0.2);
}

/* ─── Dark Mode ───────────────────────────── */
[data-theme="dark"] {
  --color-primary: #fb7185;
  --color-primary-hover: #fda4af;
  --color-primary-light: rgba(251, 113, 133, 0.1);
  --color-primary-subtle: rgba(251, 113, 133, 0.06);
  --color-primary-border: rgba(251, 113, 133, 0.2);
  
  --color-bg: #0b0f19;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;
  --color-surface-raised: #1e293b;
  --color-surface-overlay: rgba(0, 0, 0, 0.6);
  
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.14);
  
  --color-text: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-text-inverse: #0f172a;
  
  --color-success: #4ade80;
  --color-success-bg: rgba(74, 222, 128, 0.1);
  --color-warning: #fbbf24;
  --color-warning-bg: rgba(251, 191, 36, 0.1);
  --color-error: #f87171;
  --color-error-bg: rgba(248, 113, 113, 0.1);
  --color-info: #38bdf8;
  --color-info-bg: rgba(56, 189, 248, 0.1);
}
```

---

## 10. Typography Scale

### Font Family

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

### Type Scale (Inter)

```
text-xs:      0.75rem  (12px)  →  labels, badges
text-sm:      0.875rem (14px)  →  body, descriptions
text-base:    1rem     (16px)  →  default
text-md:      1.0625rem(17px)  →  emphasized body
text-lg:      1.125rem (18px)  →  card titles
text-xl:      1.25rem  (20px)  →  section headers
text-2xl:     1.5rem   (24px)  →  page headers
text-3xl:     1.875rem (30px)  →  hero headers
```

### Font Weights

```
font-normal:  400
font-medium:  500
font-semibold: 600
font-bold:    700
```

### Line Heights

```
leading-tight:    1.15  (headings)
leading-snug:     1.375 (subheaders)
leading-normal:   1.5   (body)
leading-relaxed:  1.625 (long form)
```

---

## 11. Component Specifications

### Button System

| Variant | Use Case | Style |
|---------|----------|-------|
| Primary | Main CTA | Filled primary, white text |
| Secondary | Alternative action | Border + surface bg, text color |
| Ghost | Low emphasis | Transparent, text on hover |
| Danger | Destructive action | Red fill or red border |
| Icon | Icon-only action | Square, 40x40, icon centered |

Sizes: `sm` (32px), `md` (40px), `lg` (48px)

### Card System

| Variant | Use Case | Style |
|---------|----------|-------|
| Default | Content blocks | Surface bg, border, shadow-sm |
| Elevated | Modals, focused content | Surface bg, border, shadow-md |
| Interactive | Clickable cards | Hover: elevated shadow + translateY(-1px) |
| Bento | Dashboard metrics | Large stat, icon, trend indicator |

### Form Inputs

- Height: 44px (touch-friendly)
- Border: 1px solid --color-border
- Focus: 2px primary ring with --shadow-glow
- Error: Red border + error message below
- Helper: 12px muted text below input

### Modal/Dialog

- Overlay: surface-overlay color, backdrop-blur-sm
- Content: surface-raised, shadow-xl, rounded-xl
- Padding: 24px
- Max width: 480px (sm), 640px (md), 800px (lg)
- Animation: scale-in (0.3s ease)

---

## 12. Motion Guidelines

### Duration Map

```
Micro-interactions:    100-150ms  (button press, toggle)
Element transitions:   200-250ms  (hover, focus, card elevation)
Panel transitions:     250-350ms  (sidebar open/close, modal)
Page transitions:      300-400ms  (route change)
Loading states:        600-900ms  (skeleton shimmer cycle)
```

### Easing

```
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)  /* for micro-interactions */
```

### When to Animate

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Sidebar open/close | Slide + opacity | 250ms | ease-out |
| Card hover | Elevate shadow + translateY | 200ms | ease-out |
| Modal enter | Scale in + fade | 250ms | ease-out |
| Toggle switch | Knob slide | 200ms | spring |
| Number transition | Count up | 400ms | ease-out |
| Skeleton | Shimmer sweep | 1.5s | linear |
| Theme switch | Background crossfade | 300ms | ease-out |
| Dropdown open | Slide down + fade | 200ms | ease-out |

---

## 13. Signature CRAMS Experience Recommendations

### Personalized Dashboard Greeting

```
"Good morning, Marc. You have 18 appointments today. Revenue is trending upward this week."
```
- Time-aware (morning/afternoon/evening)
- Shows user's name
- Single most relevant stat
- Trend indication (up/down/flat)

### Smart Insights (Non-Intrusive)

```
┌────────────────────────────────────────────────────────┐
│ 💡  Wednesday afternoons consistently underperform.    │
│     Would you like to create a promotion?  [Create] ✕  │
└────────────────────────────────────────────────────────┘
```
- Appears at the top of the dashboard
- Dismissible (X button)
- Actionable CTA
- One insight at a time

### Success Celebrations

```
┌────────────────────────────────────────────────────────┐
│ 🎉  You've reached 100 appointments this month!       │
│     Best month yet.  [Share achievement]               │
└────────────────────────────────────────────────────────┘
```
- Milestone-based (50/100/500 appointments)
- Revenue milestones ($1k, $5k, $10k)
- Staff performance badges

### Empty States with Personality

```
┌────────────────────────────────────────────────┐
│                                                │
│           📅  No appointments yet               │
│                                                │
│     Ready to start filling your calendar?      │
│     Create your first service and watch the    │
│     bookings come in.                          │
│                                                │
│          [Create a Service]  [Learn More]      │
│                                                │
└────────────────────────────────────────────────┘
```
- Emoji-based illustrations
- Encouraging tone
- Clear next action
- Secondary option for learning

---

## 14. Tailwind CSS Implementation Recommendations

### Config Additions

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      crams: {
        primary: '#e11d48',
        surface: '#ffffff',
        // etc.
      }
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    animation: {
      'slide-in': 'slideIn 0.25s ease-out',
      'scale-in': 'scaleIn 0.25s ease-out',
      'count-up': 'countUp 0.4s ease-out',
    }
  }
}
```

### Component Classes to Create

```css
@layer components {
  .crams-card { @apply bg-surface border border-border rounded-xl shadow-sm; }
  .crams-card-hover { @apply transition-all hover:shadow-md hover:-translate-y-0.5; }
  .crams-input { @apply w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm transition-all; }
  .crams-btn { @apply inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all; }
  .crams-btn-primary { @apply bg-primary text-white hover:bg-primary-hover shadow-sm; }
  .crams-sidebar-item { @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all; }
  .crams-badge { @apply inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full; }
}
```

---

## 15. Responsive Behavior Documentation

### Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Sidebar collapses to bottom tab bar |
| Tablet | 640-1024px | Sidebar becomes mini (icons only) |
| Desktop | > 1024px | Full sidebar with labels |

### Sidebar States

```
Desktop:  ┌──────┬────────────────────────────┐
          │ Nav  │     Content Area            │
          │ 240px│                             │
          └──────┴────────────────────────────┘

Tablet:   ┌───┬────────────────────────────────┐
          │ M │     Content Area                │
          │ 64│                                 │
          └───┴────────────────────────────────┘

Mobile:   ┌────────────────────────────────────┐
          │         Content Area                │
          ├────────────────────────────────────┤
          │ Home │ Book │ Apps │ Account        │
          └────────────────────────────────────┘
```

### Mobile Tab Bar

Instead of a sidebar on mobile, show a bottom tab bar with 5 primary actions:
1. Home (Dashboard/Services)
2. Book (Quick booking)
3. Appointments
4. Notifications (with badge)
5. Account (Profile/Settings)

---

## 16. Premium SaaS Recommendations for Conversion & Retention

### Conversion Optimizers

1. **14-day free trial** — No credit card required, full access
2. **Interactive onboarding checklist** — "Set up your business in 5 steps"
3. **Guided tour** — First-visit overlay highlighting key features
4. **Sample data** — Pre-populated with demo services and appointments
5. **White-label option** — Remove "Powered by CRAMS" for premium tier

### Retention Drivers

1. **Weekly email digest** — "Your business this week: 18 appointments, $1,240 revenue"
2. **Mobile push notifications** — New bookings, cancellations, reminders
3. **Referral program** — "Invite a business owner, get 1 month free"
4. **Automated review requests** — Post-appointment SMS asking for review
5. **Annual discount** — Pay yearly, get 2 months free

### Monetization Tiers

| Feature | Free | Pro ($29/mo) | Business ($79/mo) |
|---------|------|---------------|-------------------|
| Appointments | 50/mo | Unlimited | Unlimited |
| Staff | 2 | 10 | Unlimited |
| Analytics | Basic | Advanced | Custom |
| API Access | — | Read-only | Full |
| White-label | — | — | ✅ |
| Priority Support | — | Email | Chat + Phone |

---

## 17. Final High-Fidelity Screen Descriptions

### Screen 1: Dashboard (Post-Login)

**Layout:** Two-column with sidebar on the left (240px) and main content on the right.

**Sidebar:**
- Top: CRAMS logo + business name dropdown
- Grouped nav with subtle dividers between groups
- Active item has primary color left border + subtle bg
- Bottom: User avatar, theme toggle, logout

**Main Content — Top Section:**
- Personalized greeting: "Good afternoon, Marc." in text-xl font-semibold
- Subtitle: "You have 18 appointments today · Revenue is ↑8% this week" in text-sm text-secondary
- 6 metric cards in a 3x2 grid:
  - Each card: Large value (text-3xl font-bold), label (text-xs muted), trend indicator (colored arrow + percentage)
  - Cards have subtle border-left color accents based on category

**Main Content — Action Center:**
- Card with yellow/amber header: "Action Required (3)"
- List items with priority dots + message + CTA buttons
- Quick action row at bottom

**Main Content — Bottom Row:**
- Left: Revenue chart (SVG bar chart, 3 columns wide)
- Right: Smart insight card with recommendation + CTA

### Screen 2: Appointment Management

**Layout:** Full-width table with filter bar at top.

**Header:** "Appointments" title + "Create Appointment" button (primary CTA)

**Filter Bar:**
- Date range picker (two date inputs with "Apply" button)
- Status filter: All | Confirmed | Completed | Cancelled (pill buttons)
- Search input with magnifying glass icon
- View toggle: List | Calendar

**Table:**
- Columns: Client | Service | Staff | Date & Time | Status | Amount | Actions
- Each row: elevation on hover, left accent border by status
- Status badges: confirmed (green), completed (blue), cancelled (red)
- Actions: Edit, Reschedule, Cancel dropdown
- Pagination at bottom with page numbers

### Screen 3: Booking Flow (Customer-Facing)

**Layout:** Centered card layout, 3-step process.

**Step 1 — Select Service:**
- Service cards in 2-column grid
- Each card: Image (or gradient placeholder), name, duration, price
- Selected state: primary border + checkmark
- "Continue" button at bottom right

**Step 2 — Pick Date & Time:**
- Left: Calendar month view with available dates highlighted
- Right: Time slots for selected day as pill buttons
- Selected date/time recap bar
- "Continue" button

**Step 3 — Confirm:**
- Booking summary card: service, date, time, duration, total
- Notes textarea with "optional" label
- "Confirm Booking" primary button
- Back button to edit

### Screen 4: Business Settings

**Layout:** Settings sidebar (200px) + content area.

**Settings Sidebar Groups:**
- BUSINESS: General, Branding, Locations, Taxes
- OPERATIONS: Staff, Service Categories, Booking Rules, Notifications
- GROWTH: Promotions, Public Pages, Widgets
- ADVANCED: Integrations, API Keys, Security

**Content Area — General Settings:**
- Floating label inputs for business name, type, description
- Color picker with preview
- Real-time preview card showing business profile
- "Save Changes" button with success/error toast

### Screen 5: Analytics Dashboard

**Layout:** Full-width with period selector.

**Header:** "Analytics & Reports" title + period pill selector (7D, 30D, 90D, All)

**Top Row:** 6 stat cards (same as dashboard) with last-period comparison

**Middle Row:**
- Left (2/3): Revenue line chart with gradient fill
- Right (1/3): Top services bar chart

**Bottom Row:**
- Left: Staff commissions list with avatars
- Right: Customer retention table

---

*End of CRAMS ServiceHub Design Strategy & Implementation Blueprint*
