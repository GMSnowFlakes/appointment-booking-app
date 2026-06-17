// ──────────────────────────────────────────────
// E2E: Admin Dashboard Flows
// ──────────────────────────────────────────────
// Tests: admin tab visibility, dashboard stats, services CRUD, appointments tab, users tab

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createTestUser } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the DB path and admin credentials from the config-generated file
function getTestConfig() {
  const configPath = path.resolve(__dirname, '.e2e-db-path.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

test.describe('Admin Dashboard', () => {
  let adminUser;
  let testConfig;

  test.beforeAll(async () => {
    testConfig = getTestConfig();
    adminUser = {
      email: testConfig.adminEmail,
      password: testConfig.adminPassword,
      name: 'E2E Admin',
    };

    // Register via API so the user exists in the dev database
    const registerRes = await fetch(`${testConfig.apiUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adminUser.name,
        email: adminUser.email,
        password: adminUser.password,
      }),
    });
    const regData = await registerRes.json();
    if (!registerRes.ok && !regData.error?.includes('already')) {
      throw new Error(`Admin register failed: ${regData.error}`);
    }

    // Promote to admin via seed-admin.cjs (PostgreSQL-compatible)
    const seedScript = path.resolve(__dirname, 'seed-admin.cjs');

    const seedOutput = execSync(
      `node "${seedScript}" "${adminUser.email}" "${adminUser.password}" "${adminUser.name}"`,
      {
        encoding: 'utf-8',
        timeout: 15000,
      }
    );

    if (!seedOutput.includes('SEED_ADMIN_COMPLETE')) {
      throw new Error(`Admin seed failed. Output: ${seedOutput}`);
    }
  });

  /**
   * Helper: login as admin and return once the home page has loaded.
   */
  async function loginAsAdmin(page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav button', { hasText: 'Sign in' }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', adminUser.password);
    await page.locator('button[type="submit"]').click();
    // Wait for navbar to show user's name (SPA - no URL navigation)
    await expect(page.locator('nav')).toContainText(adminUser.name, { timeout: 15_000 });
  }

  test('should show admin tab for admin users', async ({ page }) => {
    await loginAsAdmin(page);
    const adminNav = page.locator('nav button', { hasText: 'Admin' });
    await expect(adminNav).toBeVisible({ timeout: 5_000 });
  });

  test('should not show admin tab for regular users', async ({ page }) => {
    const user = createTestUser();

    // Register via API
    await page.request.post('http://localhost:3001/api/auth/register', {
      data: { name: user.name, email: user.email, password: user.password },
    });

    // Login
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav button', { hasText: 'Sign In' }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });

    // Admin tab should NOT be visible for regular users
    await expect(page.locator('nav button', { hasText: 'Admin' })).not.toBeVisible();
  });

  test('admin dashboard should show stats cards', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin
    await page.locator('nav button', { hasText: 'Admin' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Should see the admin dashboard header
    await expect(page.locator('h1:has-text("Dashboard"), text=ADMINISTRATION')).toBeVisible({ timeout: 10_000 });

    // Should see stats cards
    await expect(page.locator('text=Active services')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Appointments')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=registered users')).toBeVisible({ timeout: 5_000 });
  });

  test('admin services tab should list seeded services', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin
    await page.locator('nav button', { hasText: 'Admin' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Click the Services tab in the admin tab bar
    await page.locator('button:has-text("Services"):not(nav *)').first().click();
    await page.waitForLoadState('domcontentloaded');

    // Should see seed services listed
    await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
  });

  test('should allow creating a new service', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin
    await page.locator('nav button', { hasText: 'Admin' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Click the Services tab in the admin tab bar
    await page.locator('button:has-text("Services"):not(nav *)').first().click();
    await page.waitForLoadState('domcontentloaded');

    // Click Add Service button
    await page.locator('button:has-text("Add Service"):not(nav *)').click();

    // Wait for the service form modal to appear
    await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5_000 });

    // Fill the service name (first text input in the modal)
    const modalTextInputs = page.locator('text=Add New Service').locator('..').locator('input[type="text"]');
    await modalTextInputs.first().fill('E2E Test Service');

    // Fill duration (first number input)
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.first().fill('30');

    // Fill price (second number input)
    await numberInputs.nth(1).fill('50');

    // Fill category (second text input)
    const allTextInputs = page.locator('input[type="text"]');
    if (await allTextInputs.count() > 1) {
      await allTextInputs.nth(1).fill('Testing');
    }

    // Fill description textarea
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill('Service created by E2E test');
    }

    // Submit and wait for the new service to appear in the table
    await page.locator('button[type="submit"]:has-text("Create Service")').click();
    await expect(page.locator('text=E2E Test Service').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin appointments tab should load with filter', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin
    await page.locator('nav button', { hasText: 'Admin' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Click Appointments tab (in the tab bar, not navbar)
    const tabBar = page.locator('button:has-text("Appointments"):not(nav *)');
    await tabBar.first().click();
    await page.waitForLoadState('domcontentloaded');

    // Should see the appointments section
    await expect(page.locator('text=All Appointments')).toBeVisible({ timeout: 10_000 });

    // Status filter select should be present
    const filterSelect = page.locator('select').first();
    await expect(filterSelect).toBeVisible({ timeout: 5_000 });
  });

  test('admin users tab should load user list', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin
    await page.locator('nav button', { hasText: 'Admin' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Click Users tab (in the tab bar, not navbar)
    const usersTab = page.locator('button:has-text("Users"):not(nav *)');
    await usersTab.first().click();
    await page.waitForLoadState('domcontentloaded');

    // Should see user management
    await expect(page.locator('text=User Management')).toBeVisible({ timeout: 10_000 });

    // Should see at least one user (the admin)
    await expect(page.locator('text=E2E Admin').first()).toBeVisible({ timeout: 5_000 });
  });
});
