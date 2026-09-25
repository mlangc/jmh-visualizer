import { expect, test } from '@playwright/test';
import { expectBrandMenu } from '../support/brand-menu-assertions';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectStartScreen } from '../support/start-screen-assertions';

// Kept separate from the post-reset check in multi-run-summary-and-compare.spec.ts:
// the cold-load path (store.ts bootstrap) and the reset path (DefaultTopBar.tsx's
// onReset forcing a real navigation) are driven by genuinely different code that
// only coincidentally produces the same screen in today's vanilla build.
test('a fresh load renders the empty start screen', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);
  const app = new JmhApp(page);

  await page.goto('/');
  await expectStartScreen(page);

  await expectBrandMenu(page, { visible: false });
  await app.toggleBrandMenu();
  await expectBrandMenu(page, { visible: true });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
