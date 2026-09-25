import { expect, test } from '@playwright/test';
import { GISTS, gistRunName, urlRunName } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockGistApi, mockRawUrls } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';

// Companion to smoke-cost-of-alloc-rate-norm-benchmark.spec.ts's file-upload
// case: same fixture, same report, loaded via the other two mechanisms. Both
// tests mock the network (see mock-remote-fixtures.ts) rather than calling
// out to the real gist -- deterministic, offline, no GitHub API rate limit.

test.beforeEach(async ({ page }) => {
  await blockOffOrigin(page);
});

test('loading the cost-of-alloc-rate-norm-benchmark fixture via a single URL renders the same report as the file upload', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockRawUrls(page, 'costOfAllocRateNorm');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromUrls([GISTS.costOfAllocRateNorm.rawUrl]);

  // Single-URL run names keep the full filename incl. extension
  // (getUniqueNames' single-element branch), unlike the file-upload run name.
  await expectCostOfAllocRateNormReport(page, { runName: urlRunName('costOfAllocRateNorm') });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('loading the cost-of-alloc-rate-norm-benchmark fixture via a single Gist renders the same report as the file upload', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockGistApi(page, 'costOfAllocRateNorm');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromGists([GISTS.costOfAllocRateNorm.id]);

  // Gist-loaded runs are named `${gistId}/${filenameInGist}` (processParameters.ts's fetchFromGists).
  await expectCostOfAllocRateNormReport(page, { runName: gistRunName('costOfAllocRateNorm') });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
