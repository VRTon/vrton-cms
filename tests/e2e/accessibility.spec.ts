import { expect, test } from 'playwright/test';

const STORAGE_KEY = 'vrton-accessibility';
const THEME_KEY = 'vrton-theme';

async function openPanel(page) {
  await page.getByRole('button', { name: 'Preferencias de accesibilidad' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test('el boton flotante abre el panel en todas las paginas publicas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.a11y-fab')).toBeVisible();

  await page.goto('/itinerario-2026');
  await expect(page.locator('.a11y-fab')).toBeVisible();
});

test('cada preferencia se enciende por separado', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);
  const body = page.locator('body');

  await dialog.getByRole('checkbox', { name: 'Alto contraste' }).check();
  await expect(body).toHaveClass(/a11y-high-contrast/);
  await expect(body).not.toHaveClass(/a11y-reduce-motion/);
  await expect(body).not.toHaveClass(/a11y-underline-links/);

  await dialog.getByRole('checkbox', { name: 'Subrayar enlaces' }).check();
  await expect(body).toHaveClass(/a11y-underline-links/);
  await expect(body).toHaveClass(/a11y-high-contrast/);

  await dialog.getByRole('checkbox', { name: 'Alto contraste' }).uncheck();
  await expect(body).not.toHaveClass(/a11y-high-contrast/);
  await expect(body).toHaveClass(/a11y-underline-links/);
});

test('el tamano de texto tiene tres pasos y sube la base al menos un 25 por ciento', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);
  const html = page.locator('html');

  const baseSize = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

  await dialog.getByRole('radio', { name: 'Grande', exact: true }).click();
  await expect(html).toHaveAttribute('data-a11y-text-size', 'large');
  const largeSize = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(largeSize).toBeGreaterThanOrEqual(baseSize * 1.25);

  await dialog.getByRole('radio', { name: 'Muy grande' }).click();
  await expect(html).toHaveAttribute('data-a11y-text-size', 'xlarge');
  const xlargeSize = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(xlargeSize).toBeGreaterThan(largeSize);

  await expect(page.locator('body')).toHaveClass(/a11y-text-scaled/);
  await expect(page.locator('body')).toHaveCSS('line-height', /.+/);
});

test('el interlineado sube a 1.8 cuando el texto se agranda', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Grande', exact: true }).click();

  const ratio = await page.evaluate(() => {
    const styles = getComputedStyle(document.body);
    return parseFloat(styles.lineHeight) / parseFloat(styles.fontSize);
  });
  expect(ratio).toBeGreaterThanOrEqual(1.79);
});

test('las preferencias sobreviven a una recarga', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Grande', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Reducir animaciones' }).check();
  await dialog.getByRole('button', { name: 'Cerrar' }).last().click();

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'large');
  await expect(page.locator('body')).toHaveClass(/a11y-reduce-motion/);
});

test('el tema del panel y el del navbar comparten estado', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await dialog.getByRole('button', { name: 'Cerrar' }).last().click();
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await openPanel(page);
  await expect(page.getByRole('radio', { name: 'Claro', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('accesibilidad y modo oscuro funcionan a la vez', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Oscuro' }).click();
  await dialog.getByRole('checkbox', { name: 'Alto contraste' }).check();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveClass(/a11y-high-contrast/);
});

test('restablecer deja todo en el estado inicial', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Muy grande' }).click();
  await dialog.getByRole('checkbox', { name: 'Alto contraste' }).check();
  await dialog.getByRole('checkbox', { name: 'Reducir animaciones' }).check();

  await dialog.getByRole('button', { name: 'Restablecer preferencias' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'normal');
  await expect(page.locator('body')).not.toHaveClass(/a11y-high-contrast/);
  await expect(page.locator('body')).not.toHaveClass(/a11y-reduce-motion/);
  await expect(page.locator('body')).not.toHaveClass(/a11y-text-scaled/);
});

test('el interruptor maestro prende y apaga todas las opciones', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);
  const body = page.locator('body');
  const master = dialog.getByRole('checkbox', { name: 'Activar todas las opciones' });

  await master.check();
  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'large');
  await expect(body).toHaveClass(/a11y-high-contrast/);
  await expect(body).toHaveClass(/a11y-reduce-motion/);
  await expect(body).toHaveClass(/a11y-underline-links/);
  await expect(dialog.getByRole('checkbox', { name: 'Alto contraste' })).toBeChecked();

  await master.uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'normal');
  await expect(body).not.toHaveClass(/a11y-high-contrast/);
  await expect(body).not.toHaveClass(/a11y-reduce-motion/);
  await expect(body).not.toHaveClass(/a11y-underline-links/);
  await expect(body).not.toHaveClass(/a11y-text-scaled/);
});

test('el interruptor maestro queda en mixto cuando solo hay algunas opciones', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);
  const master = dialog.getByRole('checkbox', { name: 'Activar todas las opciones' });

  await expect(master).not.toBeChecked();
  await expect(master).toHaveJSProperty('indeterminate', false);

  await dialog.getByRole('checkbox', { name: 'Reducir animaciones' }).check();
  await expect(master).toHaveJSProperty('indeterminate', true);
  await expect(master).not.toBeChecked();

  await dialog.getByRole('checkbox', { name: 'Alto contraste' }).check();
  await dialog.getByRole('checkbox', { name: 'Subrayar enlaces' }).check();
  await dialog.getByRole('radio', { name: 'Grande', exact: true }).click();
  await expect(master).toBeChecked();
  await expect(master).toHaveJSProperty('indeterminate', false);
});

test('el interruptor maestro no toca el tema', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPanel(page);

  await dialog.getByRole('radio', { name: 'Oscuro' }).click();
  await dialog.getByRole('checkbox', { name: 'Activar todas las opciones' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await dialog.getByRole('checkbox', { name: 'Activar todas las opciones' }).uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('el panel se cierra con Escape y devuelve el foco al boton', async ({ page }) => {
  await page.goto('/');
  await openPanel(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.a11y-fab')).toBeFocused();
});

test('el panel bloquea el scroll de la pagina mientras esta abierto', async ({ page }) => {
  await page.goto('/');
  await openPanel(page);

  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('las casillas del panel muestran el anillo de foco del sitio', async ({ page }) => {
  await page.goto('/');
  await openPanel(page);

  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? getComputedStyle(el).outlineStyle : null;
  });
  expect(outline).toBe('solid');
});

test('la preferencia guardada del modo viejo se migra a las opciones nuevas', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.setItem(key, 'on'), STORAGE_KEY);
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'large');
  await expect(page.locator('body')).toHaveClass(/a11y-high-contrast/);
  await expect(page.locator('body')).toHaveClass(/a11y-reduce-motion/);
  await expect(page.locator('body')).toHaveClass(/a11y-underline-links/);
});

test('el "off" del modo viejo no pisa el tema oscuro antes del primer pintado', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([accessibilityKey, themeKey]) => {
    window.localStorage.setItem(accessibilityKey, 'off');
    window.localStorage.setItem(themeKey, 'dark');
  }, [STORAGE_KEY, THEME_KEY]);

  await page.route('**/main.tsx', (route) => route.abort());
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'normal');
});

test('un valor corrupto tampoco pisa el tema oscuro antes del primer pintado', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([accessibilityKey, themeKey]) => {
    window.localStorage.setItem(accessibilityKey, '{roto');
    window.localStorage.setItem(themeKey, 'dark');
  }, [STORAGE_KEY, THEME_KEY]);

  await page.route('**/main.tsx', (route) => route.abort());
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'normal');
});

test('sin preferencias no hay regresion visual respecto al modo normal', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('body');

  await expect(page.locator('html')).toHaveAttribute('data-a11y-text-size', 'normal');
  await expect(body).not.toHaveClass(/a11y-text-scaled/);
  await expect(body).not.toHaveClass(/a11y-high-contrast/);
  await expect(body).not.toHaveClass(/a11y-reduce-motion/);
  await expect(body).not.toHaveClass(/a11y-underline-links/);
});

