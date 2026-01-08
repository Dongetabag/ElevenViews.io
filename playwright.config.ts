import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://72.61.72.94:3003',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
    headless: true,
  },
  outputDir: './test-results',
});
