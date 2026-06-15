# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking.spec.js >> Services >> should search and filter services
- Location: e2e\booking.spec.js:27:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Our Services')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Our Services')

```

```yaml
- navigation:
  - button "AppointmentBook Salon & Spa":
    - img
    - text: AppointmentBook Salon & Spa
  - button "Switch to dark mode":
    - img
  - button "Sign in"
  - button "Get Started"
- main:
  - img
  - heading "Failed to load services" [level=2]
  - paragraph: Too many requests. Please slow down.
  - button "Try Again"
- contentinfo:
  - img
  - text: AppointmentBook
  - paragraph: © 2026 — Online booking platform
```

# Test source

```ts
  1   | // ──────────────────────────────────────────────
  2   | // E2E: Booking & Appointment Flows
  3   | // ──────────────────────────────────────────────
  4   | // Tests: browse services, book appointment, view appointments, filter
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | import { createTestUser } from './helpers.js';
  8   | 
  9   | test.describe('Services', () => {
  10  | 
  11  |   test('should display services on the landing page', async ({ page }) => {
  12  |     await page.goto('/');
  13  |     await page.waitForLoadState('domcontentloaded');
  14  | 
  15  |     // Wait for "Our Services" heading to appear (services loaded)
  16  |     await expect(page.locator('text=Our Services')).toBeVisible({ timeout: 15_000 });
  17  | 
  18  |     // Should show seeded services
  19  |     await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  20  |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  21  | 
  22  |     // Should show category headings
  23  |     await expect(page.locator('h2:has-text("Hair")').first()).toBeVisible({ timeout: 5_000 });
  24  |     await expect(page.locator('h2:has-text("Wellness")').first()).toBeVisible({ timeout: 5_000 });
  25  |   });
  26  | 
  27  |   test('should search and filter services', async ({ page }) => {
  28  |     await page.goto('/');
  29  |     await page.waitForLoadState('domcontentloaded');
> 30  |     await expect(page.locator('text=Our Services')).toBeVisible({ timeout: 15_000 });
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  31  | 
  32  |     // Type in the search box
  33  |     const searchInput = page.locator('input[placeholder*="Search"]');
  34  |     await searchInput.fill('Massage');
  35  | 
  36  |     // Wait for the debounced search API call (300ms debounce)
  37  |     await page.waitForResponse(
  38  |       resp => resp.url().includes('/api/services?') && resp.status() === 200,
  39  |       { timeout: 10_000 }
  40  |     );
  41  | 
  42  |     // Should show massage-related service
  43  |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  44  | 
  45  |     // "Haircut" should not be visible (filtered out)
  46  |     await expect(page.locator('text=Haircut & Styling')).not.toBeVisible();
  47  | 
  48  |     // Clear the search
  49  |     await searchInput.fill('');
  50  | 
  51  |     // Wait for all services to reappear
  52  |     await page.waitForResponse(
  53  |       resp => resp.url().includes('/api/services') && resp.status() === 200,
  54  |       { timeout: 10_000 }
  55  |     );
  56  | 
  57  |     // All services should be back
  58  |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  59  |     await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  60  |   });
  61  | });
  62  | 
  63  | test.describe('Book Appointment', () => {
  64  | 
  65  |   test('should require authentication to book', async ({ page }) => {
  66  |     // Without being logged in, "Book Appointment" should not be in the navbar
  67  |     await page.goto('/');
  68  |     await page.waitForLoadState('domcontentloaded');
  69  |     await expect(page.locator('nav button', { hasText: 'Book Appointment' })).not.toBeVisible();
  70  |   });
  71  | 
  72  |   test('should show booking form for authenticated users', async ({ page }) => {
  73  |     const user = createTestUser();
  74  | 
  75  |     // Register via API for speed
  76  |     const regRes = await page.request.post('http://localhost:3001/api/auth/register', {
  77  |       data: { name: user.name, email: user.email, password: user.password },
  78  |     });
  79  |     expect(regRes.ok()).toBeTruthy();
  80  | 
  81  |     // Login via UI
  82  |     await page.goto('/');
  83  |     await page.waitForLoadState('domcontentloaded');
  84  |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  85  |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  86  |     await page.fill('input[type="email"]', user.email);
  87  |     await page.fill('input[type="password"]', user.password);
  88  |     await page.locator('button[type="submit"]').click();
  89  |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  90  | 
  91  |     // Navigate to Book Appointment
  92  |     await page.locator('nav button', { hasText: 'Book Appointment' }).click();
  93  | 
  94  |     // Wait for the booking form to load with services
  95  |     await expect(page.locator('text=Choose a Service')).toBeVisible({ timeout: 10_000 });
  96  | 
  97  |     // Should see service options (radio buttons)
  98  |     const serviceRadios = page.locator('input[name="service"]');
  99  |     await expect(serviceRadios.first()).toBeVisible({ timeout: 10_000 });
  100 |   });
  101 | });
  102 | 
  103 | test.describe('View and Manage Appointments', () => {
  104 | 
  105 |   test('should show empty state for new users', async ({ page }) => {
  106 |     const user = createTestUser();
  107 | 
  108 |     // Register via API
  109 |     await page.request.post('http://localhost:3001/api/auth/register', {
  110 |       data: { name: user.name, email: user.email, password: user.password },
  111 |     });
  112 | 
  113 |     // Login via UI
  114 |     await page.goto('/');
  115 |     await page.waitForLoadState('domcontentloaded');
  116 |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  117 |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  118 |     await page.fill('input[type="email"]', user.email);
  119 |     await page.fill('input[type="password"]', user.password);
  120 |     await page.locator('button[type="submit"]').click();
  121 |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  122 | 
  123 |     // Navigate to My Appointments
  124 |     await page.locator('nav button', { hasText: 'My Appointments' }).click();
  125 |     await page.waitForLoadState('domcontentloaded');
  126 | 
  127 |     // Should see the appointments page header
  128 |     await expect(page.locator('h1:has-text("My Appointments")')).toBeVisible({ timeout: 10_000 });
  129 | 
  130 |     // Should show empty state (no appointments yet)
```