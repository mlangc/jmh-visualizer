import { test } from '@playwright/test';
import { ALL_THREE_GIST_ID, allThreeGistRunName } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockMultiFileGistApi } from '../support/mock-remote-fixtures';
import { expectMultiRunWorkflow } from '../support/multi-run-workflow';
import { watchDialogsAndErrors } from '../support/page-watchers';

// Companion to multi-run-summary-and-compare.spec.ts's file-upload case: same
// 3 fixtures, same workflow, but loaded from a single gist ID that holds all
// 3 as separate files -- exercising fetchFromGists' one-run-per-file-in-the-
// gist fan-out (processParameters.js), which none of the other Gist specs
// reach (they each mock a single-file gist). Mocked network, like the other
// URL/Gist specs (see mock-remote-fixtures.ts).
//
// Incidental extra coverage: unlike the file-upload spec, this one's "Reset &
// Upload New" step (inside expectMultiRunWorkflow) runs against a URL that
// actually has query params (?gist=...), so it also exercises
// DefaultTopBar.jsx's window.location.href query-string stripping on reset,
// not just the reload itself.

test.beforeEach(async ({ page }) => {
  await blockOffOrigin(page);
});

test('loading all 3 fixtures from one multi-file gist supports the same Summary/Compare workflow as the file upload', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockMultiFileGistApi(page, 'costOfAllocRateNorm', 'linkedHash', 'linkedHashOnBattery');
  const app = new JmhApp(page);
  await page.goto('/');
  // A single Gist 1 field expands into all 3 runs -- expectedRunCount must be
  // passed explicitly since the dialog only ever sees 1 gist ID.
  await app.loadFromGists([ALL_THREE_GIST_ID], 3);

  await expectMultiRunWorkflow(
    page,
    app,
    {
      costOfAllocRateNorm: allThreeGistRunName('costOfAllocRateNorm'),
      linkedHash: allThreeGistRunName('linkedHash'),
      linkedHashOnBattery: allThreeGistRunName('linkedHashOnBattery')
    },
    { dialogs, pageErrors }
  );
});
