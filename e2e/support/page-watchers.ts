import type { Page } from '@playwright/test';

export type PageWatchers = { dialogs: string[]; pageErrors: string[] };

/**
 * Registers `dialog`/`pageerror` listeners on `page` and returns the arrays
 * they populate, so specs can assert `dialogs`/`pageErrors` stay empty
 * (a JMH parse failure surfaces as a native `window.alert()`, dismissed here
 * so it doesn't hang the test; an uncaught exception surfaces as a
 * `pageerror` event). Not also collecting console errors: the app already
 * emits unrelated unknown-prop warnings (e.g. TocLink's prop spread), so a
 * blanket console-error assertion would be noise, not signal.
 *
 * Call this BEFORE the load/action under test, not after -- an event that
 * fires before the listener is registered is missed, so this must not be
 * deferred behind `app.uploadReport()`/`loadFromUrls()`/etc.
 */
export function watchDialogsAndErrors(page: Page): PageWatchers {
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  return { dialogs, pageErrors };
}
