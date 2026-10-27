import { expect, test } from '@playwright/test';
import { GISTS } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockRawUrls } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { Tags } from '../support/tags';

// The browser history around the Details screen: the address bar is expected to be the
// source of truth for which class is detailed, so Back, Forward, a reload and a pasted
// link all land on the screen the URL names. None of that holds today -- store.ts keeps
// the detailed class in memory only, pushes a bare `#details` and undetails on every POP
// -- so every test here carries `@needs-fix-for-history`. Where today's behaviour is
// pinned instead, see detail-screen.spec.ts (`@must-not-have-fix-for-history`).
//
// Deliberately format-agnostic: nothing here knows what the URL looks like, specs that
// need a link just copy whatever the app put in the address bar.
//
// Reload and link tests load through `?sources=`, since an upload doesn't survive a reload.

const detailsHeading = (page: import('@playwright/test').Page, className: string) =>
  page.getByRole('heading', { name: new RegExp(`Details of .*${className}$`) });

test.describe('the Details screen and browser history', { tag: Tags.NeedsFixForHistory }, () => {
  test('Back and Forward walk through the detailed classes in order', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.loadBundledExample('single');
    await app.showDetailsFromSidebar('ListCreationBenchmark');
    await app.selectDetailedBenchmarkClass('NullIndexBenchmark');

    await page.goBack();
    await expect(detailsHeading(page, 'ListCreationBenchmark')).toBeVisible();

    await page.goBack();
    await expect(page.getByText('Back..')).toHaveCount(0);

    await page.goForward();
    await expect(detailsHeading(page, 'ListCreationBenchmark')).toBeVisible();

    await page.goForward();
    await expect(detailsHeading(page, 'NullIndexBenchmark')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Forward returns to the Details screen after the in-app Back link left it', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
    await app.showDetails();

    await app.goBack();
    await expect(page.getByText('Back..')).toHaveCount(0);

    await page.goForward();
    await expect(detailsHeading(page, 'LinkedHashFirstVsIterNextBenchmark')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('a reload keeps the Details screen', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);
    await blockOffOrigin(page);
    await mockRawUrls(page, 'linkedHash');

    const app = new JmhApp(page);
    await app.gotoWithSources([GISTS.linkedHash.rawUrl]);
    await app.showDetails();

    await page.reload();
    await expect(detailsHeading(page, 'LinkedHashFirstVsIterNextBenchmark')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('a copied Details link opens the Details screen, and its Back link stays in the app', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);
    await blockOffOrigin(page);
    await mockRawUrls(page, 'linkedHash');

    const app = new JmhApp(page);
    await app.gotoWithSources([GISTS.linkedHash.rawUrl]);
    await app.showDetails();
    const detailsUrl = page.url();

    // A fresh visit, with nothing in the session history to go back to but the blank page
    await page.goto('about:blank');
    await page.goto(detailsUrl);
    await expect(detailsHeading(page, 'LinkedHashFirstVsIterNextBenchmark')).toBeVisible();

    await app.goBack();
    await expect(page.getByText('Back..')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();
    expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1/);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
