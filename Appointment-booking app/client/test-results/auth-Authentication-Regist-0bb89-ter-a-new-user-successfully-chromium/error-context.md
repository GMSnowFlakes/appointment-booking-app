# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication >> Registration >> should register a new user successfully
- Location: e2e\auth.spec.js:40:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('nav button').filter({ hasText: 'Register' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e7]:
      - button "AppointmentBook Salon & Spa" [ref=e8]:
        - img [ref=e10]
        - generic [ref=e13]:
          - generic [ref=e14]: AppointmentBook
          - generic [ref=e15]: Salon & Spa
      - generic [ref=e16]:
        - button "Switch to dark mode" [ref=e17]:
          - img [ref=e18]
        - generic [ref=e20]:
          - button "Sign in" [ref=e21]
          - button "Get Started" [ref=e22]
  - main [ref=e23]:
    - generic [ref=e25]:
      - generic [ref=e28]:
        - generic [ref=e29]: Now Booking
        - heading "AppointmentBook" [level=1] [ref=e31]
        - paragraph [ref=e32]: Choose from our curated range of professional services, crafted to exceed your expectations.
        - generic [ref=e33]:
          - generic [ref=e35]:
            - generic [ref=e36]: 500+
            - generic [ref=e37]: Clients
          - generic [ref=e40]:
            - generic [ref=e41]: "4.9"
            - generic [ref=e42]: Rating
          - generic [ref=e45]:
            - generic [ref=e46]: 100%
            - generic [ref=e47]: Satisfaction
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic:
              - img
            - textbox "Search services" [ref=e51]:
              - /placeholder: Search services…
          - generic [ref=e52]:
            - button "All" [ref=e53] [cursor=pointer]
            - button "Hair" [ref=e54] [cursor=pointer]
            - button "Skincare" [ref=e55] [cursor=pointer]
            - button "Wellness" [ref=e56] [cursor=pointer]
        - generic [ref=e58]:
          - generic [ref=e60]:
            - heading "Hair" [level=2] [ref=e62]
            - generic [ref=e63]: 1 service
          - generic [ref=e68]:
            - generic [ref=e69]: Hair
            - heading "Haircut" [level=3] [ref=e70]
            - paragraph [ref=e71]: Professional haircut
            - generic [ref=e72]:
              - generic [ref=e73]:
                - img [ref=e74]
                - text: 30 min
              - generic [ref=e77]: $35.00
        - generic [ref=e79]:
          - generic [ref=e81]:
            - heading "Skincare" [level=2] [ref=e83]
            - generic [ref=e84]: 1 service
          - generic [ref=e89]:
            - generic [ref=e90]: Skincare
            - heading "Facial" [level=3] [ref=e91]
            - paragraph [ref=e92]: Deep cleansing facial
            - generic [ref=e93]:
              - generic [ref=e94]:
                - img [ref=e95]
                - text: 45 min
              - generic [ref=e98]: $55.00
        - generic [ref=e100]:
          - generic [ref=e102]:
            - heading "Wellness" [level=2] [ref=e104]
            - generic [ref=e105]: 1 service
          - generic [ref=e110]:
            - generic [ref=e111]: Wellness
            - heading "Massage" [level=3] [ref=e112]
            - paragraph [ref=e113]: Relaxing massage
            - generic [ref=e114]:
              - generic [ref=e115]:
                - img [ref=e116]
                - text: 60 min
              - generic [ref=e119]: $75.00
  - contentinfo [ref=e120]:
    - generic [ref=e122]:
      - generic [ref=e123]:
        - img [ref=e125]
        - generic [ref=e127]: AppointmentBook
      - paragraph [ref=e128]: © 2026 — Online booking platform
```

# Test source

```ts
  1   | // ──────────────────────────────────────────────
  2   | // E2E: Authentication Flows
  3   | // ──────────────────────────────────────────────
  4   | // Tests: registration, login, logout, validation errors
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | import { createTestUser } from './helpers.js';
  8   | 
  9   | test.describe('Authentication', () => {
  10  | 
  11  |   /**
  12  |    * Helper: register a user via the UI and wait for redirect to the home page.
  13  |    * Returns the registered user's credentials.
  14  |    */
  15  |   async function registerViaUI(page, user) {
  16  |     await page.goto('/');
  17  |     await page.waitForLoadState('domcontentloaded');
  18  | 
  19  |     // Click Register in the navbar
> 20  |     await page.locator('nav button', { hasText: 'Register' }).click();
      |                                                               ^ Error: locator.click: Test timeout of 60000ms exceeded.
  21  | 
  22  |     // Wait for the auth form email input to appear
  23  |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  24  | 
  25  |     // Fill registration form
  26  |     const nameInput = page.locator('input[name="name"]');
  27  |     if (await nameInput.isVisible()) {
  28  |       await nameInput.fill(user.name);
  29  |     }
  30  |     await page.fill('input[type="email"]', user.email);
  31  |     await page.fill('input[type="password"]', user.password);
  32  | 
  33  |     // Click submit and wait for navbar to show user's name
  34  |     await page.locator('button[type="submit"]').click();
  35  |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  36  |   }
  37  | 
  38  |   test.describe('Registration', () => {
  39  | 
  40  |     test('should register a new user successfully', async ({ page }) => {
  41  |       const user = createTestUser();
  42  |       await registerViaUI(page, user);
  43  |       // If we got here without error, registration succeeded
  44  |       await expect(page.locator('nav')).toContainText(user.name);
  45  |     });
  46  | 
  47  |     test('should show error for duplicate email registration', async ({ page }) => {
  48  |       const user = createTestUser();
  49  | 
  50  |       // Register the first time
  51  |       await registerViaUI(page, user);
  52  | 
  53  |       // Sign out
  54  |       await page.locator('nav button', { hasText: 'Sign Out' }).click();
  55  |       await page.waitForSelector('nav button:has-text("Sign In")', { timeout: 10_000 });
  56  | 
  57  |       // Try to register again with the same email
  58  |       await page.locator('nav button', { hasText: 'Register' }).click();
  59  |       await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  60  | 
  61  |       // Fill form with same email, different name
  62  |       const nameInput = page.locator('input[name="name"]');
  63  |       if (await nameInput.isVisible()) {
  64  |         await nameInput.fill('Duplicate User');
  65  |       }
  66  |       await page.fill('input[type="email"]', user.email);
  67  |       await page.fill('input[type="password"]', user.password);
  68  | 
  69  |       // Wait for error response from duplicate email
  70  |       await Promise.all([
  71  |         page.waitForResponse(
  72  |           resp => resp.url().includes('/api/auth/register') && resp.status() === 409,
  73  |           { timeout: 15_000 }
  74  |         ),
  75  |         page.locator('button[type="submit"]').click(),
  76  |       ]);
  77  | 
  78  |       // Error message should be visible
  79  |       await expect(page.locator('text=already registered').first()).toBeVisible({ timeout: 5_000 });
  80  |     });
  81  | 
  82  |     test('should show validation errors for empty registration', async ({ page }) => {
  83  |       await page.goto('/');
  84  |       await page.waitForLoadState('domcontentloaded');
  85  |       await page.locator('nav button', { hasText: 'Register' }).click();
  86  |       await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  87  | 
  88  |       // Submit with empty fields — client-side validation fires first
  89  |       await page.locator('button[type="submit"]').click();
  90  | 
  91  |       // Wait for client-side validation error
  92  |       await expect(page.locator('text=Name is required').first()).toBeVisible({ timeout: 5_000 });
  93  |     });
  94  |   });
  95  | 
  96  |   test.describe('Login', () => {
  97  | 
  98  |     test('should login with registered credentials', async ({ page }) => {
  99  |       const user = createTestUser();
  100 | 
  101 |       // First register the user (using API directly for speed)
  102 |       const regRes = await page.request.post('http://localhost:3001/api/auth/register', {
  103 |         data: { name: user.name, email: user.email, password: user.password },
  104 |       });
  105 |       expect(regRes.ok()).toBeTruthy();
  106 | 
  107 |       // Go to the app
  108 |       await page.goto('/');
  109 |       await page.waitForLoadState('domcontentloaded');
  110 | 
  111 |       // Click Sign In
  112 |       await page.locator('nav button', { hasText: 'Sign In' }).click();
  113 |       await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  114 | 
  115 |       // Wait for the login form heading
  116 |       await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 5_000 });
  117 | 
  118 |       // Fill credentials
  119 |       await page.fill('input[type="email"]', user.email);
  120 |       await page.fill('input[type="password"]', user.password);
```