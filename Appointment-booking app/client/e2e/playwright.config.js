// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '../../server');
const PORT = process.env.E2E_PORT || 3001;
const CLIENT_PORT = process.env.E2E_CLIENT_PORT || 5173;

// Unique Postgres schema per test run for isolation (cleans up after itself)
const testSchema = `e2e_${Date.now()}`;
process.env.PG_SCHEMA = testSchema;

// Write test metadata to a temp file so test specs can access it
const dbInfoPath = path.resolve(__dirname, '.e2e-db-path.json');
fs.writeFileSync(dbInfoPath, JSON.stringify({
  apiUrl: `http://localhost:${PORT}`,
  clientUrl: `http://localhost:${CLIENT_PORT}`,
  adminEmail: `admin-${Date.now()}@e2e-test.com`,
  adminPassword: 'E2eAdminPass123!',
}));

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  // Shared settings for all projects
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },

  // Auto-start the Express API server and Vite dev server
  webServer: [
    {
      command: `node "${path.join(serverDir, 'index.js')}"`,
      port: PORT,
      timeout: 30_000,
      reuseExistingServer: false,
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: String(PORT),
        PG_SCHEMA: testSchema,
        DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/appointmentbook',
        JWT_SECRET: 'e2e-test-jwt-secret',
        RESEND_API_KEY: '',
        DISABLE_SCHEDULER: 'true',
        DISABLE_RATE_LIMIT: 'true',
        LOG_LEVEL: 'silent',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx vite --port ${CLIENT_PORT}`,
      port: CLIENT_PORT,
      timeout: 30_000,
      reuseExistingServer: false,
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
