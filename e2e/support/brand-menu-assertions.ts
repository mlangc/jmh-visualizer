import { expect, type Page } from '@playwright/test';

export async function expectBrandMenu(page: Page, opts: { timeout?: number; visible: boolean }): Promise<void> {
  const menuItems = ['Reset & Upload New', 'Feedback & Bug Reports', 'Code @ Github', 'JMH', 'JMH Samples', 'About'];
  for (const name of menuItems) {
    await expect(page.getByRole('menuitem', { name: name, exact: true })).toBeVisible(opts);
  }
}
