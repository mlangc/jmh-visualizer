import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { BUILD_DIR, createPluginReport, pluginRunName, readFixture } from '../support/plugin-report';

// gradle-jmh-report ships a prebuilt jmh-visualizer and turns a JMH result into a report
// by unpacking it, then overwriting `provided.js` with the result embedded as JS globals.
// Nothing but this file's contract ties the two projects together, so these specs pin the
// parts a change here could break without any other spec noticing: the files the plugin
// expects in a build, and a report the plugin made rendering when opened straight from disk.

const FIXTURE = 'linked-hash-first-vs-iter-next-benchmark.json';

test.describe('the build, as the plugin consumes it', () => {
  test('ships provided.js and settings.js next to index.html, loaded by relative script tags', async () => {
    for (const file of ['index.html', 'bundle.js', 'provided.js', 'settings.js', 'favicons/favicon.ico']) {
      expect(fs.existsSync(path.join(BUILD_DIR, file)), file).toBe(true);
    }

    // Relative, and ahead of the bundle: the app reads both files' globals while it starts up.
    const html = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts).toEqual(['provided.js', 'settings.js', 'bundle.js']);
  });

  test('provided.js is a placeholder defining exactly the two globals, with nothing provided', async () => {
    const sandbox: Record<string, unknown> = {};
    vm.runInNewContext(fs.readFileSync(path.join(BUILD_DIR, 'provided.js'), 'utf8'), sandbox);

    expect(Object.getOwnPropertyNames(sandbox).sort()).toEqual(['providedBenchmarkStore', 'providedBenchmarks']);
    expect(sandbox.providedBenchmarks).toEqual([]);
  });
});

test.describe('a report written the way the plugin writes it, opened from disk', () => {
  test('renders the provided run without any upload', async ({ page }, testInfo) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);
    const app = new JmhApp(page);

    const url = createPluginReport(testInfo.outputPath('report'), FIXTURE, readFixture(FIXTURE));
    await page.goto(url);

    const runName = pluginRunName(FIXTURE);
    await expect(page.getByText(new RegExp(`different benchmark classes for single run '${runName}'`))).toBeVisible();

    const chart = page.locator('.recharts-wrapper');
    await expect(chart.getByText('entryIteratorNext')).toBeVisible();
    await expect(chart.getByText(/s\/op/)).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Dropzone' })).toHaveCount(0);

    // With something provided, "Reset & Upload New" must be gone: it would reload the page
    // into the same report.
    await app.toggleBrandMenu();
    await expect(page.getByRole('menuitem', { name: /Code @ Github/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Reset & Upload New/ })).toHaveCount(0);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // The plugin derives the run name from the file name and quotes it into the script as is.
  for (const resultFileName of ['results.json', 'my.run-1.v2.json', 'no-extension']) {
    test(`names the run after '${resultFileName}'`, async ({ page }, testInfo) => {
      const { dialogs, pageErrors } = watchDialogsAndErrors(page);

      await page.goto(createPluginReport(testInfo.outputPath('report'), resultFileName, readFixture(FIXTURE)));

      const runName = pluginRunName(resultFileName);
      await expect(page.getByText(new RegExp(`for single run '${runName.replaceAll('.', '\\.')}'`))).toBeVisible();

      expect(dialogs).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  // The plugin writes provided.js as UTF-8 and the page reads it as a classic script; a
  // charset mix-up would turn the umlaut into mojibake without anything failing.
  test('keeps non-ASCII characters of the result intact', async ({ page }, testInfo) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);
    const result = readFixture(FIXTURE).replaceAll('"size"', '"größe"');
    expect(result).toContain('größe');

    await page.goto(createPluginReport(testInfo.outputPath('report'), FIXTURE, result));

    await expect(page.getByText('größe', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Ã', { exact: false })).toHaveCount(0);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // A real JMH writer's output, with its quirks (`"key" : value`, CRLF line ends on Windows),
  // goes in line by line; the line-wise copy must not change what the browser parses.
  test('copes with CRLF line ends in the result', async ({ page }, testInfo) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);
    const result = readFixture(FIXTURE).replaceAll('\r\n', '\n').replaceAll('\n', '\r\n');

    await page.goto(createPluginReport(testInfo.outputPath('report'), FIXTURE, result));

    await expect(page.locator('.recharts-wrapper').getByText('entryIteratorNext')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
