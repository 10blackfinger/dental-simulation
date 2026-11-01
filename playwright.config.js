import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/dental-simulation/',
    headless: true,
    viewport: { width: 1440, height: 1000 }
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/dental-simulation/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
