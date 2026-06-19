// ──────────────────────────────────────────────
// E2E Test Helpers
// ──────────────────────────────────────────────

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

let _uid = 0;
function uid() {
  return `${Date.now()}-${++_uid}`;
}

/**
 * Generate a unique test user object.
 */
export function createTestUser(overrides = {}) {
  const id = uid();
  return {
    name: overrides.name || `Test User ${id}`,
    email: overrides.email || `e2e-${id}@test.com`,
    password: overrides.password || 'TestPass123!',
    role: overrides.role || 'customer',
  };
}

/**
 * Seed an admin user via the register endpoint and promote via the DB path.
 * We need to do this by calling the register endpoint and then a direct DB update.
 * Actually, we'll just use the admin API after registering an admin via the seed script.
 *
 * Since we can't run seed.js inside the test, let's create a helper that:
 * 1. Registers a user
 * 2. Then directly promotes them via the API (which won't work without admin auth)
 *
 * Better approach: Use the server's seed.js logic by calling the register endpoint,
 * then directly update the user's role via a PUT to /api/auth/... no, that won't work.
 *
 * Simplest approach: Create the admin user via the register page during test setup.
 */
export async function createAdminUser(request) {
  const admin = createTestUser({ role: 'admin' });

  // Register via API
  const res = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      name: admin.name,
      email: admin.email,
      password: admin.password,
    },
  });

  if (!res.ok()) {
    const body = await res.json();
    throw new Error(`Failed to register admin: ${body.error || res.status()}`);
  }

  const data = await res.json();

  // Promote to admin via the admin API (using the token we just got)
  const promoteRes = await request.put(
    `${API_BASE}/api/admin/users/${data.user.id}/role`,
    {
      headers: { Authorization: `Bearer ${data.token}` },
      data: { role: 'admin' },
    }
  );

  if (!promoteRes.ok()) {
    // If promotion fails (e.g., 403 because user isn't admin yet),
    // we need a different approach. Let's use a direct DB query approach.
    // Actually, we need an admin user to promote others. Let's first register
    // and then set the role via a special setup endpoint.
    throw new Error('Admin promotion requires an existing admin. Use seedAdminUserViaDb instead.');
  }

  return { ...admin, token: data.token, user: data.user };
}

/**
 * Wait for the application to be fully loaded and interactive.
 */
export async function waitForApp(page) {
  // Wait for the app shell to render
  await page.waitForLoadState('networkidle');
  // Wait a bit for React to hydrate
  await page.waitForTimeout(1000);
}

/**
 * Navigate to a page via the navbar, clicking the appropriate button.
 */
export async function navigateTo(page, pageName) {
  // Map page names to navbar button text patterns
  const tabMap = {
    services: /Services/,
    book: /Book Appointment/,
    appointments: /My Appointments/,
    admin: /Admin/,
  };

  const pattern = tabMap[pageName];
  if (!pattern) {
    throw new Error(`Unknown page: ${pageName}`);
  }

  const btn = page.locator('nav button', { hasText: pattern });
  await btn.click();
  await page.waitForTimeout(500);
}

/**
 * Log in a user via the login form.
 */
export async function loginAs(page, email, password) {
  // Navigate to login
  await page.goto('/');

  // Click Sign In in the navbar
  const signInBtn = page.locator('nav button', { hasText: 'Sign In' });
  await signInBtn.click();

  // Wait for the auth form to appear
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click submit (the button with "Sign In" text in the form)
  await page.click('button[type="submit"]');

  // Wait for redirect back to services page
  await page.waitForTimeout(2000);
}

/**
 * Get available time slots from the API for a given service and date.
 */
export async function getAvailableSlots(request, serviceId, date) {
  const res = await request.get(
    `${API_BASE}/api/appointments/availability?service_id=${serviceId}&date=${date}`
  );
  const data = await res.json();
  return data.slots || [];
}
