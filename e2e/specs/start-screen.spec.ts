import { expect, test } from '@playwright/test';
import { expectStartScreen } from '../support/start-screen-assertions';
import { watchDialogsAndErrors } from '../support/page-watchers';

// Kept separate from the post-reset check in multi-run-summary-and-compare.spec.ts:
// the cold-load path (store.js bootstrap) and the reset path (DefaultTopBar.jsx's
// onReset forcing a real navigation) are driven by genuinely different code that
// only coincidentally produces the same screen in today's vanilla build.
test('a fresh load renders the empty start screen', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await page.goto('/');
  await expectStartScreen(page);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
