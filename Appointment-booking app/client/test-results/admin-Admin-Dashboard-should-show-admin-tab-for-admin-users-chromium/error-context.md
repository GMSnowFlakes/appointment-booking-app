# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin Dashboard >> should show admin tab for admin users
- Location: e2e\admin.spec.js:84:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav button').filter({ hasText: 'Admin' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav button').filter({ hasText: 'Admin' })

```

```yaml
- navigation:
  - button "My Business Salon & Spa":
    - img
    - text: My Business Salon & Spa
  - button "Services":
    - img
    - text: Services
  - button "Book Appointment":
    - img
    - text: Book Appointment
  - button "My Appointments":
    - img
    - text: My Appointments
  - button "Switch to dark mode":
    - img
  - text: E E2E Admin
  - button "Sign Out":
    - img
    - text: Sign Out
- main:
  - text: Our Services
  - heading "My Business, Expertly Crafted" [level=1]
  - paragraph: Choose from our curated range of professional services
  - img
  - textbox "Search services..."
  - combobox:
    - option "All Categories" [selected]
    - option "Grooming"
    - option "Hair"
    - option "Makeup"
    - option "Nails"
    - option "Skincare"
    - option "Wellness"
  - heading "Grooming" [level=2]
  - paragraph: 1 service
  - text: Grooming
  - img
  - heading "Beard Trim & Shave" [level=3]
  - paragraph: Precision beard trim with hot towel shave
  - img
  - text: 30 min $30.00
  - heading "Hair" [level=2]
  - paragraph: 2 services
  - text: Hair
  - img
  - heading "Hair Coloring" [level=3]
  - paragraph: Full hair coloring with premium products
  - img
  - text: 90 min $85.00 Hair
  - img
  - heading "Haircut & Styling" [level=3]
  - paragraph: Professional haircut and styling service
  - img
  - text: 45 min $45.00
  - heading "Makeup" [level=2]
  - paragraph: 1 service
  - text: Makeup
  - img
  - heading "Makeup Application" [level=3]
  - paragraph: Professional makeup for any occasion
  - img
  - text: 60 min $55.00
  - heading "Nails" [level=2]
  - paragraph: 2 services
  - text: Nails
  - img
  - heading "Manicure" [level=3]
  - paragraph: Classic manicure with nail shaping and polish
  - img
  - text: 45 min $35.00 Nails
  - img
  - heading "Pedicure" [level=3]
  - paragraph: Relaxing pedicure with foot massage
  - img
  - text: 60 min $45.00
  - heading "Skincare" [level=2]
  - paragraph: 1 service
  - text: Skincare
  - img
  - heading "Facial Treatment" [level=3]
  - paragraph: Deep cleansing facial with mask and massage
  - img
  - text: 60 min $65.00
  - heading "Wellness" [level=2]
  - paragraph: 1 service
  - text: Wellness
  - img
  - heading "Massage Therapy" [level=3]
  - paragraph: Full body relaxation massage
  - img
  - text: 60 min $75.00
- contentinfo:
  - img
  - text: My Business
  - paragraph: © 2026 — Online booking platform
```

# Test source

```ts
  1   | // ──────────────────────────────────────────────
  2   | // E2E: Admin Dashboard Flows
  3   | // ──────────────────────────────────────────────
  4   | // Tests: admin tab visibility, dashboard stats, services CRUD, appointments tab, users tab
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | import { execSync } from 'child_process';
  8   | import path from 'path';
  9   | import fs from 'fs';
  10  | import { fileURLToPath } from 'url';
  11  | import { createTestUser } from './helpers.js';
  12  | 
  13  | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  14  | 
  15  | // Read the DB path and admin credentials from the config-generated file
  16  | function getTestConfig() {
  17  |   const configPath = path.resolve(__dirname, '.e2e-db-path.json');
  18  |   return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  19  | }
  20  | 
  21  | test.describe('Admin Dashboard', () => {
  22  |   let adminUser;
  23  |   let testConfig;
  24  | 
  25  |   test.beforeAll(async () => {
  26  |     testConfig = getTestConfig();
  27  |     adminUser = {
  28  |       email: testConfig.adminEmail,
  29  |       password: testConfig.adminPassword,
  30  |       name: 'E2E Admin',
  31  |     };
  32  | 
  33  |     // Register via API so the user exists in the dev database
  34  |     const registerRes = await fetch(`${testConfig.apiUrl}/api/auth/register`, {
  35  |       method: 'POST',
  36  |       headers: { 'Content-Type': 'application/json' },
  37  |       body: JSON.stringify({
  38  |         name: adminUser.name,
  39  |         email: adminUser.email,
  40  |         password: adminUser.password,
  41  |       }),
  42  |     });
  43  |     const regData = await registerRes.json();
  44  |     if (!registerRes.ok && !regData.error?.includes('already')) {
  45  |       throw new Error(`Admin register failed: ${regData.error}`);
  46  |     }
  47  | 
  48  |     // Promote to admin via seed-admin.cjs with the dev database path
  49  |     // This script finds existing user by email and updates role to 'admin'
  50  |     const serverDir = path.resolve(__dirname, '../../server');
  51  |     const devDbPath = path.join(serverDir, 'appointments.db');
  52  |     const seedScript = path.resolve(__dirname, 'seed-admin.cjs');
  53  |     const serverNodeModules = path.join(serverDir, 'node_modules');
  54  | 
  55  |     const seedOutput = execSync(
  56  |       `node "${seedScript}" "${devDbPath}" "${adminUser.email}" "${adminUser.password}" "${adminUser.name}"`,
  57  |       {
  58  |         encoding: 'utf-8',
  59  |         timeout: 15000,
  60  |         env: { ...process.env, NODE_PATH: serverNodeModules },
  61  |       }
  62  |     );
  63  | 
  64  |     if (!seedOutput.includes('SEED_ADMIN_COMPLETE')) {
  65  |       throw new Error(`Admin seed failed. Output: ${seedOutput}`);
  66  |     }
  67  |   });
  68  | 
  69  |   /**
  70  |    * Helper: login as admin and return once the home page has loaded.
  71  |    */
  72  |   async function loginAsAdmin(page) {
  73  |     await page.goto('/');
  74  |     await page.waitForLoadState('domcontentloaded');
  75  |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  76  |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  77  |     await page.fill('input[type="email"]', adminUser.email);
  78  |     await page.fill('input[type="password"]', adminUser.password);
  79  |     await page.locator('button[type="submit"]').click();
  80  |     // Wait for navbar to show user's name (SPA - no URL navigation)
  81  |     await expect(page.locator('nav')).toContainText(adminUser.name, { timeout: 15_000 });
  82  |   }
  83  | 
  84  |   test('should show admin tab for admin users', async ({ page }) => {
  85  |     await loginAsAdmin(page);
  86  |     const adminNav = page.locator('nav button', { hasText: 'Admin' });
> 87  |     await expect(adminNav).toBeVisible({ timeout: 5_000 });
      |                            ^ Error: expect(locator).toBeVisible() failed
  88  |   });
  89  | 
  90  |   test('should not show admin tab for regular users', async ({ page }) => {
  91  |     const user = createTestUser();
  92  | 
  93  |     // Register via API
  94  |     await page.request.post('http://localhost:3001/api/auth/register', {
  95  |       data: { name: user.name, email: user.email, password: user.password },
  96  |     });
  97  | 
  98  |     // Login
  99  |     await page.goto('/');
  100 |     await page.waitForLoadState('domcontentloaded');
  101 |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  102 |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  103 |     await page.fill('input[type="email"]', user.email);
  104 |     await page.fill('input[type="password"]', user.password);
  105 |     await page.locator('button[type="submit"]').click();
  106 |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  107 | 
  108 |     // Admin tab should NOT be visible for regular users
  109 |     await expect(page.locator('nav button', { hasText: 'Admin' })).not.toBeVisible();
  110 |   });
  111 | 
  112 |   test('admin dashboard should show stats cards', async ({ page }) => {
  113 |     await loginAsAdmin(page);
  114 | 
  115 |     // Navigate to admin
  116 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  117 |     await page.waitForLoadState('domcontentloaded');
  118 | 
  119 |     // Should see the admin dashboard header
  120 |     await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10_000 });
  121 | 
  122 |     // Should see stats cards
  123 |     await expect(page.locator('text=Active Services')).toBeVisible({ timeout: 5_000 });
  124 |     await expect(page.locator('text=Total Appointments')).toBeVisible({ timeout: 5_000 });
  125 |     await expect(page.locator('text=Registered Users')).toBeVisible({ timeout: 5_000 });
  126 |   });
  127 | 
  128 |   test('admin services tab should list seeded services', async ({ page }) => {
  129 |     await loginAsAdmin(page);
  130 | 
  131 |     // Navigate to admin
  132 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  133 |     await page.waitForLoadState('domcontentloaded');
  134 | 
  135 |     // Should be on services tab by default
  136 |     await expect(page.locator('text=Manage Services')).toBeVisible({ timeout: 10_000 });
  137 | 
  138 |     // Should see seed services listed
  139 |     await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  140 |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  141 |   });
  142 | 
  143 |   test('should allow creating a new service', async ({ page }) => {
  144 |     await loginAsAdmin(page);
  145 | 
  146 |     // Navigate to admin
  147 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  148 |     await page.waitForLoadState('domcontentloaded');
  149 | 
  150 |     // Click Add Service button
  151 |     await page.locator('button:has-text("Add Service"):not(nav *)').click();
  152 | 
  153 |     // Wait for the service form modal to appear
  154 |     await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5_000 });
  155 | 
  156 |     // Fill the service name (first text input in the modal)
  157 |     const modalTextInputs = page.locator('text=Add New Service').locator('..').locator('input[type="text"]');
  158 |     await modalTextInputs.first().fill('E2E Test Service');
  159 | 
  160 |     // Fill duration (first number input)
  161 |     const numberInputs = page.locator('input[type="number"]');
  162 |     await numberInputs.first().fill('30');
  163 | 
  164 |     // Fill price (second number input)
  165 |     await numberInputs.nth(1).fill('50');
  166 | 
  167 |     // Fill category (second text input)
  168 |     const allTextInputs = page.locator('input[type="text"]');
  169 |     if (await allTextInputs.count() > 1) {
  170 |       await allTextInputs.nth(1).fill('Testing');
  171 |     }
  172 | 
  173 |     // Fill description textarea
  174 |     const textarea = page.locator('textarea');
  175 |     if (await textarea.isVisible()) {
  176 |       await textarea.fill('Service created by E2E test');
  177 |     }
  178 | 
  179 |     // Submit and wait for the new service to appear in the table
  180 |     await page.locator('button[type="submit"]:has-text("Create Service")').click();
  181 |     await expect(page.locator('text=E2E Test Service').first()).toBeVisible({ timeout: 10_000 });
  182 |   });
  183 | 
  184 |   test('admin appointments tab should load with filter', async ({ page }) => {
  185 |     await loginAsAdmin(page);
  186 | 
  187 |     // Navigate to admin
```