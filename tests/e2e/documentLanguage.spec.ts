import { expect, test } from 'playwright/test';

test.describe('idioma declarado en el documento', () => {
  test('una ruta sin prefijo se declara en espanol', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('una ruta con prefijo /en se declara en ingles', async ({ page }) => {
    await page.goto('/en/legal');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('volver a una ruta en espanol restaura el idioma', async ({ page }) => {
    await page.goto('/en/legal');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/legal');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('navegar dentro de la SPA tambien actualiza el idioma', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
