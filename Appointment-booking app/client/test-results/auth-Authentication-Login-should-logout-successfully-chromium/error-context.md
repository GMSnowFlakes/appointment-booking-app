# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication >> Login >> should logout successfully
- Location: e2e\auth.spec.js:149:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav button').filter({ hasText: 'Register' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('nav button').filter({ hasText: 'Register' })

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
  121 | 
  122 |       // Submit and wait for navbar to show user's name
  123 |       await page.locator('button[type="submit"]').click();
  124 |       await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  125 |     });
  126 | 
  127 |     test('should show error for invalid credentials', async ({ page }) => {
  128 |       await page.goto('/');
  129 |       await page.waitForLoadState('domcontentloaded');
  130 |       await page.locator('nav button', { hasText: 'Sign In' }).click();
  131 |       await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  132 | 
  133 |       await page.fill('input[type="email"]', 'nonexistent@test.com');
  134 |       await page.fill('input[type="password"]', 'wrongpassword');
  135 | 
  136 |       // Submit and wait for error response
  137 |       await Promise.all([
  138 |         page.waitForResponse(
  139 |           resp => resp.url().includes('/api/auth/login') && !resp.ok(),
  140 |           { timeout: 10_000 }
  141 |         ),
  142 |         page.locator('button[type="submit"]').click(),
  143 |       ]);
  144 | 
  145 |       // Error message should be visible
  146 |       await expect(page.locator('text=Invalid').first()).toBeVisible({ timeout: 5_000 });
  147 |     });
  148 | 
  149 |     test('should logout successfully', async ({ page }) => {
  150 |       const user = createTestUser();
  151 | 
  152 |       // Register via API for speed
  153 |       await page.request.post('http://localhost:3001/api/auth/register', {
  154 |         data: { name: user.name, email: user.email, password: user.password },
  155 |       });
  156 | 
  157 |       // Login via UI
  158 |       await page.goto('/');
  159 |       await page.waitForLoadState('domcontentloaded');
  160 |       await page.locator('nav button', { hasText: 'Sign In' }).click();
  161 |       await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  162 |       await page.fill('input[type="email"]', user.email);
  163 |       await page.fill('input[type="password"]', user.password);
  164 |       await page.locator('button[type="submit"]').click();
  165 |       await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  166 | 
  167 |       // Log out
  168 |       await page.locator('nav button', { hasText: 'Sign Out' }).click();
  169 |       await page.waitForSelector('nav button:has-text("Sign In")', { timeout: 10_000 });
  170 | 
  171 |       // Should see Sign In and Register buttons
  172 |       await expect(page.locator('nav button', { hasText: 'Sign In' })).toBeVisible();
> 173 |       await expect(page.locator('nav button', { hasText: 'Register' })).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  174 |     });
  175 |   });
  176 | });
  177 | 
```