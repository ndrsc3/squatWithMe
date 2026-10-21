// Browser test of the real, logged-in app: `npm run e2e`.
//
// Runs against `vercel dev` on the dev database (dev:full's preflight refuses production),
// starting it if nothing is on :3000. Not part of `check` or CI: previews have Deployment
// Protection and CI has no database. Run it before asking for PR approval on UI changes.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
    testDir: 'e2e',
    testMatch: '**/*.e2e.ts', // not *.spec.ts: vitest would collect those
    outputDir: 'e2e/.results',
    globalSetup: './e2e/clean-dev.ts',
    timeout: 60_000,
    fullyParallel: true,
    reporter: 'list',
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [
        { name: 'phone', use: { ...devices['Pixel 7'] } },
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    ],
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : { command: 'npm run dev:full', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
