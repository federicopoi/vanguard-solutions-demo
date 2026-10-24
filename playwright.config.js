import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  webServer: { command: 'npm run dev -- --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:5180', launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } },
  reporter: 'list',
});
