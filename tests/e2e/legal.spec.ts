import { expect, test } from 'playwright/test';

test('renders bilingual legal content with independent accessible accordions', async ({ page }) => {
  await page.goto('/legal');

  await expect(page.getByRole('heading', { name: 'Documentación legal de VRTon 2026' })).toBeVisible();
  const terms = page.locator('#terminos');
  const rules = page.locator('#normas');
  const volunteering = page.locator('#voluntariado');
  await expect(page.locator('.content-accordion-item')).toHaveCount(3);

  await terms.getByText('Términos y Condiciones', { exact: true }).click();
  await rules.getByText('Normas de Convivencia', { exact: true }).click();
  await expect(terms).toHaveAttribute('open', '');
  await expect(rules).toHaveAttribute('open', '');

  await terms.getByText('Términos y Condiciones', { exact: true }).click();
  await expect(terms).not.toHaveAttribute('open', '');
  await expect(rules).toHaveAttribute('open', '');

  const volunteeringSummary = volunteering.getByText('Términos de Voluntariado', { exact: true });
  await volunteeringSummary.focus();
  await page.keyboard.press('Enter');
  await expect(volunteering).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(volunteering).not.toHaveAttribute('open', '');
  await expect(volunteeringSummary).toBeFocused();

  await page.goto('/legal#normas');
  await expect(rules).toHaveAttribute('open', '');
  await expect(rules.locator('summary')).toBeFocused();

  await page.goto('/en/legal#terms');
  await expect(page.getByRole('heading', { name: 'VRTon 2026 Legal Documentation' })).toBeVisible();
  await expect(page.locator('#terms')).toHaveAttribute('open', '');
  await expect(page.locator('#code-of-conduct')).toBeVisible();
  await expect(page.locator('#volunteering')).toBeVisible();
});

test('redirects every legacy legal route to its localized anchor', async ({ page }) => {
  const routes = [
    { path: '/legal/terms', es: 'terminos', en: 'terms' },
    { path: '/legal/code-of-conduct', es: 'normas', en: 'code-of-conduct' },
    { path: '/legal/volunteering', es: 'voluntariado', en: 'volunteering' },
    { path: '/legal-terms', es: 'terminos', en: 'terms' },
    { path: '/legal-code-of-conduct', es: 'normas', en: 'code-of-conduct' },
    { path: '/legal-volunteering', es: 'voluntariado', en: 'volunteering' },
  ];

  for (const route of routes) {
    for (const trailingSlash of ['', '/']) {
      await page.goto(`${route.path}${trailingSlash}`);
      await expect(page).toHaveURL(new RegExp(`/legal#${route.es}$`));

      await page.goto(`/es${route.path}${trailingSlash}`);
      await expect(page).toHaveURL(new RegExp(`/es/legal#${route.es}$`));

      await page.goto(`/en${route.path}${trailingSlash}`);
      await expect(page).toHaveURL(new RegExp(`/en/legal#${route.en}$`));
    }
  }
});

test('points navigation, footer, and the volunteering FAQ to the unified page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.nav-menu').getByRole('link', { name: 'Legal' })).toHaveAttribute('href', '/legal');
  await expect(page.locator('.footer').getByRole('link', { name: 'Terminos de Servicio' })).toHaveAttribute('href', '/legal#terminos');
  await expect(page.locator('.footer').getByRole('link', { name: 'Codigo de Conducta' })).toHaveAttribute('href', '/legal#normas');
  await expect(page.locator('.footer').getByRole('link', { name: 'Terminos de Voluntariado' })).toHaveAttribute('href', '/legal#voluntariado');

  await page.getByText('Como puedo ser voluntario?', { exact: true }).click();
  await expect(page.locator('.faq-answer a[href="/legal#voluntariado"]')).toHaveAttribute('href', '/legal#voluntariado');

  await page.goto('/en/');
  await expect(page.locator('.nav-menu').getByRole('link', { name: 'Legal' })).toHaveAttribute('href', '/en/legal');
  await expect(page.locator('.footer').getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/en/legal#terms');
});

test('keeps the legal page responsive without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/legal#terminos');

  await expect(page.locator('#terminos')).toHaveAttribute('open', '');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});
