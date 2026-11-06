import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4317/', ...devices['iPhone 13'], browserName: 'chromium', serviceWorkers: 'allow' },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, testMatch: /smoke/ },
  ],
  webServer: { command: 'npm run build && npx vite preview --port 4317 --strictPort', port: 4317, reuseExistingServer: false, timeout: 120_000 },
});
