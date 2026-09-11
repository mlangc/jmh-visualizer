import { defineConfig, devices } from '@playwright/test';

const BUILD_DIR = process.env.APP_BUILD_DIR ?? '../build';
const PORT = 4173;

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Same strictness everywhere: no whole-test replay. A test with a
  // legitimate need to relax this does so locally, per-file or per-test
  // (`test.describe.configure({ retries: N })`), with a comment + tracking
  // issue — never globally. `expect(...)` still auto-polls regardless.
  retries: 0,
  // Serial in CI: deterministic, no cross-test resource contention. Raise for
  // speed as the suite grows, at the risk of timeout flake retries:0 won't
  // absorb. Local default (half the CPU cores) left alone.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',   // retries:0 -> 'on-first-retry' never fires
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx http-server "${BUILD_DIR}" -a 127.0.0.1 -p ${PORT} -s -c-1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
