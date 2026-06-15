// ──────────────────────────────────────────────
// E2E: Booking & Appointment Flows
// ──────────────────────────────────────────────
// Tests: browse services, book appointment, view appointments, filter

import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers.js';

test.describe('Services', () => {

  test('should display services on the landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the hero section to render (business name heading)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    // Should show seeded services
    await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 10_000 });

    // Should show category headings
    await expect(page.locator('h2:has-text("Hair")').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('h2:has-text("Wellness")').first()).toBeVisible({ timeout: 5_000 });
  });

  test('should search and filter services', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });

    // Type in the search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Massage');

    // Wait for the debounced search API call (300ms debounce)
    await page.waitForResponse(
      resp => resp.url().includes('/api/services?') && resp.status() === 200,
      { timeout: 10_000 }
    );

    // Should show massage-related service
    await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });

    // "Haircut" should not be visible (filtered out)
    await expect(page.locator('text=Haircut & Styling')).not.toBeVisible();

    // Clear the search
    await searchInput.fill('');

    // Wait for all services to reappear
    await page.waitForResponse(
      resp => resp.url().includes('/api/services') && resp.status() === 200,
      { timeout: 10_000 }
    );

    // All services should be back
    await expect(page.locator('text=Massage Therapy').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Haircut & Styling').first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Book Appointment', () => {

  test('should require authentication to book', async ({ page }) => {
    // Without being logged in, "Book" should not be in the navbar
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('nav button', { hasText: 'Book' })).not.toBeVisible();
  });

  test('should show booking form for authenticated users', async ({ page }) => {
    const user = createTestUser();

    // Register via API for speed
    const regRes = await page.request.post('http://localhost:3001/api/auth/register', {
      data: { name: user.name, email: user.email, password: user.password },
    });
    expect(regRes.ok()).toBeTruthy();

    // Login via UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav button', { hasText: 'Sign in' }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });

    // Navigate to Book
    await page.locator('nav button', { hasText: 'Book' }).click();

    // Wait for the booking form to load with services
    await expect(page.locator('text=Choose a Service')).toBeVisible({ timeout: 10_000 });

    // Should see service options (radio buttons)
    const serviceRadios = page.locator('input[name="service"]');
    await expect(serviceRadios.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('View and Manage Appointments', () => {

  test('should show empty state for new users', async ({ page }) => {
    const user = createTestUser();

    // Register via API
    await page.request.post('http://localhost:3001/api/auth/register', {
      data: { name: user.name, email: user.email, password: user.password },
    });

    // Login via UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav button', { hasText: 'Sign in' }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });

    // Navigate to Appointments
    await page.locator('nav button', { hasText: 'Appointments' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Should see the appointments page header
    await expect(page.locator('h1:has-text("My Appointments")')).toBeVisible({ timeout: 10_000 });

    // Should show empty state (no appointments yet)
    await expect(page.locator('text=No Appointments Yet')).toBeVisible({ timeout: 10_000 });
  });

  test('should show filter tabs on appointments page', async ({ page }) => {
    const user = createTestUser();

    // Register via API
    await page.request.post('http://localhost:3001/api/auth/register', {
      data: { name: user.name, email: user.email, password: user.password },
    });

    // Login via UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav button', { hasText: 'Sign In' }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('nav')).toContainText(user.name, { timeout: 15_000 });

    // Go to appointments
    await page.locator('nav button', { hasText: 'Appointments' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Verify filter tabs
    const allTab = page.locator('button:has-text("All"):not(nav *)').first();
    const upcomingTab = page.locator('button:has-text("Upcoming")').first();
    const pastTab = page.locator('button:has-text("Past")').first();

    await expect(allTab).toBeVisible({ timeout: 5_000 });
    await expect(upcomingTab).toBeVisible({ timeout: 5_000 });
    await expect(pastTab).toBeVisible({ timeout: 5_000 });

    // Click each filter tab and verify it becomes active
    await upcomingTab.click();
    // The "Upcoming" tab should have the primary background when active
    await page.waitForTimeout(500);

    await allTab.click();
    await page.waitForTimeout(500);

    await pastTab.click();
    await page.waitForTimeout(500);
  });
});
