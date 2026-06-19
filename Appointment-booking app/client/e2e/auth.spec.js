// ──────────────────────────────────────────────
// E2E: Authentication Flows
// ──────────────────────────────────────────────
// Tests: registration, login, logout, validation errors

import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers.js';

const HEADER_GET_STARTED = 'header.top-header button:has-text("Get Started")';
const HEADER_SIGN_IN = 'header.top-header button:has-text("Sign in")';

test.describe('Authentication', () => {

  /**
   * Helper: register a user via the UI and wait for redirect to the home page.
   * Returns the registered user's credentials.
   */
  async function registerViaUI(page, user) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click Get Started in the header
    await page.locator(HEADER_GET_STARTED).click();

    // Wait for the auth form email input to appear
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

    // Fill registration form
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(user.name);
    }
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);

    // Click submit and wait for header to show user's name
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.top-header')).toContainText(user.name, { timeout: 15_000 });
  }

  test.describe('Registration', () => {

    test('should register a new user successfully', async ({ page }) => {
      const user = createTestUser();
      await registerViaUI(page, user);
      // If we got here without error, registration succeeded
      await expect(page.locator('.top-header')).toContainText(user.name);
    });

    test('should show error for duplicate email registration', async ({ page }) => {
      const user = createTestUser();

      // Register the first time
      await registerViaUI(page, user);

      // Sign out (logout button is in the sidebar footer)
      // First open sidebar if collapsed on mobile, then click Sign out
      const logoutBtn = page.locator('aside.sidebar button[title="Sign out"]');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
      } else {
        // Sidebar might be collapsed — open it first
        await page.locator('header button[aria-label="Toggle sidebar"]').click();
        await page.waitForTimeout(500);
        await page.locator('aside.sidebar button[title="Sign out"]').click();
      }
      await page.waitForSelector(HEADER_GET_STARTED, { timeout: 10_000 });

      // Try to register again with the same email
      await page.locator(HEADER_GET_STARTED).click();
      await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

      // Fill form with same email, different name
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Duplicate User');
      }
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      // Wait for error response from duplicate email
      await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/auth/register') && resp.status() === 409,
          { timeout: 15_000 }
        ),
        page.locator('button[type="submit"]').click(),
      ]);

      // Error message should be visible
      await expect(page.locator('text=already registered').first()).toBeVisible({ timeout: 5_000 });
    });

    test('should show validation errors for empty registration', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.locator(HEADER_GET_STARTED).click();
      await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

      // Submit with empty fields — client-side validation fires first
      await page.locator('button[type="submit"]').click();

      // Wait for client-side validation error
      await expect(page.locator('text=Name is required').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Login', () => {

    test('should login with registered credentials', async ({ page }) => {
      const user = createTestUser();

      // First register the user (using API directly for speed)
      const regRes = await page.request.post('http://localhost:3001/api/auth/register', {
        data: { name: user.name, email: user.email, password: user.password },
      });
      expect(regRes.ok()).toBeTruthy();

      // Go to the app
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Click Sign in in the header
      await page.locator(HEADER_SIGN_IN).click();
      await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

      // Wait for the login form heading
      await expect(page.locator('text=Sign in').first()).toBeVisible({ timeout: 5_000 });

      // Fill credentials
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);

      // Submit and wait for header to show user's name
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.top-header')).toContainText(user.name, { timeout: 15_000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.locator(HEADER_SIGN_IN).click();
      await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

      await page.fill('input[type="email"]', 'nonexistent@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit and wait for error response
      await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/auth/login') && !resp.ok(),
          { timeout: 10_000 }
        ),
        page.locator('button[type="submit"]').click(),
      ]);

      // Error message should be visible
      await expect(page.locator('text=Invalid').first()).toBeVisible({ timeout: 5_000 });
    });

    test('should logout successfully', async ({ page }) => {
      const user = createTestUser();

      // Register via API for speed
      await page.request.post('http://localhost:3001/api/auth/register', {
        data: { name: user.name, email: user.email, password: user.password },
      });

      // Login via UI
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.locator(HEADER_SIGN_IN).click();
      await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.top-header')).toContainText(user.name, { timeout: 15_000 });

      // Log out via the sidebar footer button
      const logoutBtn = page.locator('aside.sidebar button[title="Sign out"]');
      await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
      await logoutBtn.click();
      await page.waitForSelector(HEADER_GET_STARTED, { timeout: 10_000 });

      // Should see Sign in and Get Started buttons
      await expect(page.locator(HEADER_SIGN_IN)).toBeVisible();
      await expect(page.locator(HEADER_GET_STARTED)).toBeVisible();
    });
  });
});
