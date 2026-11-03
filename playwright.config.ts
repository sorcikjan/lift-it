import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      LIFTIT_DB: 'memory',
      LIFTIT_DEV_AUTH: '1',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      DATABASE_URL: '',
      INTEGRATIONS_MOCK: '1',
    },
  },
});
