import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDefaultEventsRows } from './defaultHomeContent.ts';
import { normalizeEventsRowsWithCatalog } from '../page/utils.ts';

describe('homepage event links', () => {
  it('builds localized links for every default edition', () => {
    const spanishRows = buildDefaultEventsRows('es');
    const englishRows = buildDefaultEventsRows('en-US');

    assert.deepStrictEqual(
      spanishRows.map(({ year, href }) => [year, href]),
      [
        ['2025', '/eventos/vrton-2025'],
        ['2024', '/eventos/vrton-2024'],
        ['2023', '/eventos/vrton-2023'],
      ],
    );
    assert.deepStrictEqual(
      englishRows.map(({ year, href }) => [year, href]),
      [
        ['2025', '/en/events/vrton-2025'],
        ['2024', '/en/events/vrton-2024'],
        ['2023', '/en/events/vrton-2023'],
      ],
    );
  });

  it('preserves configured href and accepts legacy rows without it', () => {
    const rows = normalizeEventsRowsWithCatalog([
      { year: '2024', href: '/eventos/vrton-2024', events: [] },
      { year: '2023', events: [] },
    ], []);

    assert.equal(rows[0].href, '/eventos/vrton-2024');
    assert.equal(rows[1].href, undefined);
  });
});
