import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    headless: true,
    browserName: 'chromium',
    launchOptions: {
      args: ['--incognito'],
    },
  },
});