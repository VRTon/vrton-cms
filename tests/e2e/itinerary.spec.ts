import { expect, test } from 'playwright/test';

test('renders the bilingual itinerary and accessible activity modal', async ({ page }) => {
  await page.goto('/itinerario-2026');

  await expect(page.getByRole('heading', { name: 'Itinerario de actividades VRTon 2026' })).toBeVisible();
  await expect(page.locator('.itinerary-table tbody tr')).toHaveCount(7);
  await expect(page.getByRole('columnheader', { name: 'Instancia Principal' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Instancia de Fiesta' })).toBeVisible();

  const activity = page.getByRole('button', { name: /Bienvenida de la comunidad/ }).first();
  await activity.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Bienvenida de la comunidad' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused();

  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(activity).toBeFocused();

  await activity.click();
  await page.locator('.itinerary-modal-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(activity).toBeFocused();

  await activity.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(activity).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

  await page.locator('select[aria-label="Language"]').selectOption('en');
  await expect(page).toHaveURL(/\/en\/itinerario-2026$/);
  await expect(page.getByRole('heading', { name: 'VRTon 2026 Activity Schedule' })).toBeVisible();

  await page.goto('/es/itinerario-2026');
  await expect(page.getByRole('heading', { name: 'Itinerario de actividades VRTon 2026' })).toBeVisible();
});

test('uses stacked instance sections on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/itinerario-2026');

  await expect(page.locator('.itinerary-desktop')).toBeHidden();
  await expect(page.locator('.itinerary-mobile-instance')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Instancia Principal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Instancia de Fiesta' })).toBeVisible();

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});

test('shows the activity description in cards and in the modal on both layouts', async ({ page }) => {
  await page.goto('/itinerario-2026');

  const desktopActivity = page.locator('.itinerary-desktop')
    .getByRole('button', { name: /Musica de Bienvenida/ });
  const desktopPreview = desktopActivity.locator('.itinerary-activity-copy span');
  await expect(desktopPreview).toHaveText('Momento chill y relax');

  await desktopActivity.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.itinerary-modal-description')).toHaveText('Momento chill y relax');
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileActivity = page.locator('.itinerary-mobile-party')
    .getByRole('button', { name: /Musica de Bienvenida/ });
  const mobilePreview = mobileActivity.locator('.itinerary-activity-copy span');
  await expect(mobilePreview).toHaveText('Momento chill y relax');

  await mobileActivity.click();
  await expect(page.getByRole('dialog').locator('.itinerary-modal-description'))
    .toHaveText('Momento chill y relax');
});

test('keeps the desktop table at the 768px breakpoint and supports dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/itinerario-2026');

  await expect(page.locator('.itinerary-desktop')).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('.itinerary-block')).toBeVisible();
});
