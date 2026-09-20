import { defineConfig, devices } from '@playwright/test';

function parseFlag(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (['0', 'false', 'no', ''].includes(normalizedValue)) {
    return false;
  } else if (['1', 'true', 'yes'].includes(normalizedValue)) {
    return true;
  } else {
    throw new Error(`${name}: Cannot parse '${value}' as boolean`);
  }
}

const INCLUDE_FILTERS = parseFlag('INCLUDE_FILTERS', true);
// Opts *out* of tests that need an app fix this suite ships alongside -- set it when
// pointing APP_BUILD_DIR at a build that predates the fix. The two tag axes are
// independent: @filters/@no-filters says which branch's UI is under test, @needs-fix
// says which app fixes the build has. /@needs-fix/ has no trailing \b on purpose, so a
// per-fix tag (@needs-fix-summary-run-names) is covered by the same switch.
const SKIP_NEEDS_FIX = parseFlag('SKIP_NEEDS_FIX');
const BUILD_DIR = process.env.APP_BUILD_DIR ?? '../build';
const PORT = 4173;

const grepInvert = [INCLUDE_FILTERS ? /@no-filters\b/ : /@filters\b/];
if (SKIP_NEEDS_FIX) {
  grepInvert.push(/@needs-fix/);
}

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
    // Bar labels go through Number.toLocaleString(), so the browser locale decides
    // whether a score reads '60,050' or '60.050' (report-assertions.ts pins the
    // former). Chromium defaults to en-US here, but pin it: the suite's determinism
    // shouldn't rest on a default.
    locale: 'en-US',
    trace: 'retain-on-failure' // retries:0 -> 'on-first-retry' never fires
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx http-server "${BUILD_DIR}" -a 127.0.0.1 -p ${PORT} -s -c-1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000
  },
  grepInvert
});
