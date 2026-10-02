import { defineConfig, devices } from '@playwright/test';
import { Tags } from './support/tags';

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
// One HAS_FIX_FOR_* flag per app fix this suite ships alongside -- set it to 0 when
// pointing APP_BUILD_DIR at a build that predates the fix. The tag axes are
// independent: @filters/@no-filters says which branch's UI is under test, while each
// @needs-fix-for-* tag says which app fix the build has.
const HAS_FIX_FOR_SUMMARY_RUN_NAMES = parseFlag('HAS_FIX_FOR_SUMMARY_RUN_NAMES', true);
const HAS_FIX_FOR_SINGLE_METHOD = parseFlag('HAS_FIX_FOR_SINGLE_METHOD', true);
const BUILD_DIR = process.env.APP_BUILD_DIR ?? '../build';
const PORT = 4173;

const grepInvert = [INCLUDE_FILTERS ? /@no-filters\b/ : /@filters\b/];
if (!HAS_FIX_FOR_SUMMARY_RUN_NAMES) {
  grepInvert.push(new RegExp(Tags.NeedsFixForSummaryRunNames));
}

if (HAS_FIX_FOR_SINGLE_METHOD) {
  grepInvert.push(new RegExp(Tags.MustNotHaveFixForSingleMethod));
} else {
  grepInvert.push(new RegExp(Tags.NeedsFixForSingleMethod));
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
