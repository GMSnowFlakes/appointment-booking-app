# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin Dashboard >> should show admin tab for admin users
- Location: e2e\admin.spec.js:79:3

# Error details

```
Error: Command failed: node "C:\Users\marcp\Downloads\Freebuff\Appointment-booking app\client\e2e\seed-admin.cjs" "admin-1781492557028@e2e-test.com" "E2eAdminPass123!" "E2E Admin"
node:internal/modules/cjs/loader:1503
  throw err;
  ^

Error: Cannot find module 'bcryptjs'
Require stack:
- C:\Users\marcp\Downloads\Freebuff\Appointment-booking app\client\e2e\seed-admin.cjs
    at Module._resolveFilename (node:internal/modules/cjs/loader:1500:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1116:12)
    at Module._load (node:internal/modules/cjs/loader:1285:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1600:12)
    at require (node:internal/modules/helpers:153:16)
    at Object.<anonymous> (C:\Users\marcp\Downloads\Freebuff\Appointment-booking app\client\e2e\seed-admin.cjs:11:16)
    at Module._compile (node:internal/modules/cjs/loader:1854:14) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\marcp\\Downloads\\Freebuff\\Appointment-booking app\\client\\e2e\\seed-admin.cjs'
  ]
}

Node.js v24.16.0

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
  48  |     // Promote to admin via seed-admin.cjs (PostgreSQL-compatible)
  49  |     const seedScript = path.resolve(__dirname, 'seed-admin.cjs');
  50  | 
> 51  |     const seedOutput = execSync(
      |                        ^ Error: Command failed: node "C:\Users\marcp\Downloads\Freebuff\Appointment-booking app\client\e2e\seed-admin.cjs" "admin-1781492557028@e2e-test.com" "E2eAdminPass123!" "E2E Admin"
  52  |       `node "${seedScript}" "${adminUser.email}" "${adminUser.password}" "${adminUser.name}"`,
  53  |       {
  54  |         encoding: 'utf-8',
  55  |         timeout: 15000,
  56  |       }
  57  |     );
  58  | 
  59  |     if (!seedOutput.includes('SEED_ADMIN_COMPLETE')) {
  60  |       throw new Error(`Admin seed failed. Output: ${seedOutput}`);
  61  |     }
  62  |   });
  63  | 
  64  |   /**
  65  |    * Helper: login as admin and return once the home page has loaded.
  66  |    */
  67  |   async function loginAsAdmin(page) {
  68  |     await page.goto('/');
  69  |     await page.waitForLoadState('domcontentloaded');
  70  |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  71  |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  72  |     await page.fill('input[type="email"]', adminUser.email);
  73  |     await page.fill('input[type="password"]', adminUser.password);
  74  |     await page.locator('button[type="submit"]').click();
  75  |     // Wait for navbar to show user's name (SPA - no URL navigation)
  76  |     await expect(page.locator('nav')).toContainText(adminUser.name, { timeout: 15_000 });
  77  |   }
  78  | 
  79  |   test('should show admin tab for admin users', async ({ page }) => {
  80  |     await loginAsAdmin(page);
  81  |     const adminNav = page.locator('nav button', { hasText: 'Admin' });
  82  |     await expect(adminNav).toBeVisible({ timeout: 5_000 });
  83  |   });
  84  | 
  85  |   test('should not show admin tab for regular users', async ({ page }) => {
  86  |     const user = createTestUser();
  87  | 
  88  |     // Register via API
  89  |     await page.request.post('http://localhost:3001/api/auth/register', {
  90  |       data: { name: user.name, email: user.email, password: user.password },
  91  |     });
  92  | 
  93  |     // Login
  94  |     await page.goto('/');
  95  |     await page.waitForLoadState('domcontentloaded');
  96  |     await page.locator('nav button', { hasText: 'Sign In' }).click();
  97  |     await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  98  |     await page.fill('input[type="email"]', user.email);
  99  |     await page.fill('input[type="password"]', user.password);
  100 |     await page.locator('button[type="submit"]').click();
  101 |     await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });
  102 | 
  103 |     // Admin tab should NOT be visible for regular users
  104 |     await expect(page.locator('nav button', { hasText: 'Admin' })).not.toBeVisible();
  105 |   });
  106 | 
  107 |   test('admin dashboard should show stats cards', async ({ page }) => {
  108 |     await loginAsAdmin(page);
  109 | 
  110 |     // Navigate to admin
  111 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  112 |     await page.waitForLoadState('domcontentloaded');
  113 | 
  114 |     // Should see the admin dashboard header
  115 |     await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10_000 });
  116 | 
  117 |     // Should see stats cards
  118 |     await expect(page.locator('text=Active Services')).toBeVisible({ timeout: 5_000 });
  119 |     await expect(page.locator('text=Total Appointments')).toBeVisible({ timeout: 5_000 });
  120 |     await expect(page.locator('text=Registered Users')).toBeVisible({ timeout: 5_000 });
  121 |   });
  122 | 
  123 |   test('admin services tab should list seeded services', async ({ page }) => {
  124 |     await loginAsAdmin(page);
  125 | 
  126 |     // Navigate to admin
  127 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  128 |     await page.waitForLoadState('domcontentloaded');
  129 | 
  130 |     // Should be on services tab by default
  131 |     await expect(page.locator('text=Manage Services')).toBeVisible({ timeout: 10_000 });
  132 | 
  133 |     // Should see seed services listed
  134 |     await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  135 |     await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  136 |   });
  137 | 
  138 |   test('should allow creating a new service', async ({ page }) => {
  139 |     await loginAsAdmin(page);
  140 | 
  141 |     // Navigate to admin
  142 |     await page.locator('nav button', { hasText: 'Admin' }).click();
  143 |     await page.waitForLoadState('domcontentloaded');
  144 | 
  145 |     // Click Add Service button
  146 |     await page.locator('button:has-text("Add Service"):not(nav *)').click();
  147 | 
  148 |     // Wait for the service form modal to appear
  149 |     await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5_000 });
  150 | 
  151 |     // Fill the service name (first text input in the modal)
```