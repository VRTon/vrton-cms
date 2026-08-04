import { expect, test } from 'playwright/test';

const socialNetworks = ['Discord', 'VRChat', 'Instagram', 'X', 'TikTok', 'YouTube', 'Twitch'];

test('renders configurable Spanish homepage refinements', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Asistir', exact: true }))
    .toHaveAttribute('href', 'https://discord.gg/AR72D2nfpp');
  await expect(page.getByRole('link', { name: 'Ser Voluntario', exact: true }))
    .toHaveAttribute('href', /docs\.google\.com\/forms/);

  for (const network of socialNetworks) {
    await expect(page.locator('.social-icons').getByRole('link', { name: network, exact: true })).toBeVisible();
    await expect(page.locator('.footer-social').getByRole('link', { name: network, exact: true })).toBeVisible();
  }

  for (const year of ['2025', '2024', '2023']) {
    await expect(page.getByRole('link', { name: `Ver edición: VRTon ${year}` }))
      .toHaveAttribute('href', `/eventos/vrton-${year}`);
  }

  const faqQuestion = page.getByRole('button', { name: 'Que es VRTon?' });
  await faqQuestion.click();
  await expect(faqQuestion.locator('xpath=..')).toHaveClass(/active/);
});

test('renders the English homepage content and edition links', async ({ page }) => {
  await page.goto('/en/');

  await expect(page.getByRole('link', { name: 'Attend', exact: true }))
    .toHaveAttribute('href', 'https://discord.gg/AR72D2nfpp');
  await expect(page.getByRole('link', { name: 'Volunteer', exact: true }))
    .toHaveAttribute('href', /docs\.google\.com\/forms/);

  for (const year of ['2025', '2024', '2023']) {
    await expect(page.getByRole('link', { name: `View edition: VRTon ${year}` }))
      .toHaveAttribute('href', `/en/events/vrton-${year}`);
  }

  await expect(page.getByRole('button', { name: 'What is VRTon?' })).toBeVisible();
});

test('keeps event cards keyboard accessible and responsive at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const firstEdition = page.getByRole('link', { name: 'Ver edición: VRTon 2025' });
  await firstEdition.focus();
  await expect(firstEdition).toBeFocused();

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});
