import { expect, test } from 'playwright/test';

test('supports legal anchors and redirects when deployed under a base path', async ({ page }) => {
  await page.goto('/vrton-cms/legal#normas');
  await expect(page.locator('#normas')).toHaveAttribute('open', '');

  await page.goto('/vrton-cms/legal-terms');
  await expect(page).toHaveURL(/\/vrton-cms\/legal#terminos$/);
  await expect(page.locator('#terminos')).toHaveAttribute('open', '');
});
