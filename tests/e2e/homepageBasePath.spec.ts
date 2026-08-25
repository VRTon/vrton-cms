import { expect, test } from 'playwright/test';

test('keeps localized event links inside the production basename', async ({ page }) => {
  await page.goto('/vrton-cms/');

  await expect(page.locator('[data-carousel="2025"] .event-card-link'))
    .toHaveAttribute('href', '/vrton-cms/eventos/vrton-2025');

  await page.locator('select[aria-label="Language"]').selectOption('en');
  await expect(page).toHaveURL(/\/vrton-cms\/en\/$/);
  await expect(page.locator('[data-carousel="2025"] .event-card-link'))
    .toHaveAttribute('href', '/vrton-cms/en/events/vrton-2025');

  await page.locator('[data-carousel="2025"] .event-card-link').click();
  await expect(page).toHaveURL(/\/vrton-cms\/en\/events\/vrton-2025$/);
  await expect(page.getByRole('heading', { name: 'VRTon 2025', level: 1 })).toBeVisible();
});
