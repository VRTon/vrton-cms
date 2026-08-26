import { expect, test } from 'playwright/test';

const editions = [
  { year: '2023', amount: 'USD 474', collaborators: 3 },
  { year: '2024', amount: 'USD 1458', collaborators: 8 },
  { year: '2025', amount: 'USD 3.255', collaborators: 12 },
];

for (const edition of editions) {
  test(`renders the VRTon ${edition.year} archive`, async ({ page }) => {
    await page.goto(`/eventos/vrton-${edition.year}`);

    await expect(page.getByRole('heading', { name: `VRTon ${edition.year}`, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: `Previous slide (${edition.year})` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Next slide (${edition.year})` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to slide 1' })).toBeVisible();
    await expect(page.getByText(edition.amount, { exact: true })).toBeVisible();
    await expect(page.locator('.event-page-blocks .content-gallery-item')).toHaveCount(edition.collaborators);
  });
}

test('navigates from the homepage and switches the event URL to English', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /VRTon 2024/ }).click();
  await expect(page).toHaveURL(/\/eventos\/vrton-2024$/);

  await page.locator('select[aria-label="Language"]').selectOption('en');
  await expect(page).toHaveURL(/\/en\/events\/vrton-2024$/);
  await expect(page.getByText(/Overview of VRTon 2024/)).toBeVisible();
});

test('supports the explicit Spanish route and rejects unknown editions', async ({ page }) => {
  await page.goto('/es/eventos/vrton-2024');
  await expect(page.getByRole('heading', { name: 'VRTon 2024', level: 1 })).toBeVisible();

  await page.goto('/eventos/vrton-2019');
  await expect(page.getByRole('heading', { name: /Metaverso/i })).toBeVisible();
});

test('shows the localized placeholder for an event preview without photos', async ({ page }) => {
  const previewFile = 'content/pages/vrton-2099/es.md';
  const rawMarkdown = `---
title: "VRTon 2099"
slug: "vrton-2099"
lang: "es"
status: "draft"
updatedAt: "2026-08-14T00:00:00.000Z"
kind: "event"
description: "Vista previa sin fotos."
---

\`\`\`json blocks
[{ "type": "section", "title": "Contenido", "items": [] }]
\`\`\``;
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify({ rawMarkdown: value }));
  }, { key: `vrton:admin-preview:${previewFile}`, value: rawMarkdown });

  await page.goto(`/eventos/vrton-2099?adminPreview=1&previewFile=${encodeURIComponent(previewFile)}`);
  await expect(page.getByText('No hay fotos disponibles para esta edición.')).toBeVisible();
});

test('is keyboard accessible and does not overflow at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/eventos/vrton-2024');

  const next = page.getByRole('button', { name: 'Next slide (2024)' });
  await next.focus();
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Go to slide 2' })).toHaveClass(/active/);

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});

test('works in dark and accessible modes', async ({ page }) => {
  await page.goto('/eventos/vrton-2025');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.a11y-fab').click();
  await page.getByRole('checkbox', { name: 'Alto contraste' }).check();
  await expect(page.locator('body')).toHaveClass(/a11y-high-contrast/);
});
