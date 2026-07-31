import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createDefaultBlock } from '../page/blocks.ts';
import { normalizeBlocksForBuilder, stripClientIds } from '../page/utils.ts';
import {
  createEmptyItineraryRow,
  getItineraryDescriptionPreview,
  ITINERARY_ICON_OPTIONS,
  normalizeItineraryActivity,
  normalizeItineraryBlock,
} from './itineraryModel.ts';

describe('itinerary model', () => {
  it('creates an empty itinerary block with two fixed columns', () => {
    const block = createDefaultBlock('itinerary');
    assert.equal(block.type, 'itinerary');
    assert.deepEqual(block.columns.map((column) => column.id), ['main', 'party']);
    assert.deepEqual(block.rows, []);
  });

  it('normalizes malformed columns to main and party only', () => {
    const block = normalizeItineraryBlock({
      type: 'itinerary',
      columns: [
        { id: 'party', label: 'Fiesta' },
        { id: 'other', label: 'Ignored' },
        { id: 'main', label: 'Principal' },
      ],
      rows: [],
    });
    assert.deepEqual(block.columns, [
      { id: 'main', label: 'Principal' },
      { id: 'party', label: 'Fiesta' },
    ]);
  });

  it('preserves empty cells and normalizes 24-hour times', () => {
    const block = normalizeItineraryBlock({
      type: 'itinerary',
      rows: [{
        startTime: ' 12:00 ',
        endTime: '13:00',
        activities: {
          main: { title: 'Welcome', description: 'Opening', icon: 'welcome' },
          party: null,
        },
      }],
    });
    assert.equal(block.rows[0].startTime, '12:00');
    assert.equal(block.rows[0].endTime, '13:00');
    assert.equal(block.rows[0].activities.main.title, 'Welcome');
    assert.equal(block.rows[0].activities.party, null);
  });

  it('rejects times outside the HH:mm 24-hour format', () => {
    const block = normalizeItineraryBlock({
      type: 'itinerary',
      rows: [{
        startTime: '9:00',
        endTime: '24:00',
        activities: { main: null, party: null },
      }],
    });
    assert.equal(block.rows[0].startTime, '');
    assert.equal(block.rows[0].endTime, '');
  });

  it('drops invalid icon values without dropping activity content', () => {
    assert.deepEqual(normalizeItineraryActivity({
      title: 'Panel',
      description: 'Questions',
      icon: 'raw-css-class',
    }), {
      title: 'Panel',
      description: 'Questions',
    });
  });

  it('maps every semantic icon to a class included in Font Awesome Free', () => {
    const fontAwesomeCss = readFileSync(
      new URL('../../../node_modules/@fortawesome/fontawesome-free/css/all.css', import.meta.url),
      'utf8',
    );

    for (const option of ITINERARY_ICON_OPTIONS) {
      assert.equal(
        fontAwesomeCss.includes(`.${option.className}`),
        true,
        `${option.value} maps to missing Font Awesome class ${option.className}`,
      );
    }
  });

  it('uses only the first logical description line for activity cards', () => {
    assert.equal(
      getItineraryDescriptionPreview('Momento chill y relax\n\nLorem ipsum dolor sit amet.'),
      'Momento chill y relax',
    );
    assert.equal(
      getItineraryDescriptionPreview('First line\r\nSecond line'),
      'First line',
    );
    assert.equal(
      getItineraryDescriptionPreview('A single long line'),
      'A single long line',
    );
    assert.equal(getItineraryDescriptionPreview(null), '');
  });

  it('preserves an explicitly enabled activity while its fields are empty', () => {
    assert.deepEqual(normalizeItineraryActivity({}), {
      title: '',
      description: '',
    });
  });

  it('preserves editable whitespace while typing in every text field', () => {
    const [block] = normalizeBlocksForBuilder([{
      type: 'itinerary',
      title: ' Event schedule ',
      columns: [
        { id: 'main', label: '' },
        { id: 'party', label: 'Party column ' },
      ],
      rows: [{
        startTime: '12:00',
        endTime: '13:00',
        activities: {
          main: {
            title: 'Community ',
            description: 'Welcome to the event ',
            speaker: 'VRTon team ',
            image: ' /images/welcome.png ',
            imageAlt: 'Welcome image ',
            icon: 'welcome',
          },
          party: null,
        },
      }],
    }]);

    assert.equal(block.title, ' Event schedule ');
    assert.equal(block.columns[0].label, '');
    assert.equal(block.columns[1].label, 'Party column ');
    assert.equal(block.rows[0].activities.main.title, 'Community ');
    assert.equal(block.rows[0].activities.main.description, 'Welcome to the event ');
    assert.equal(block.rows[0].activities.main.speaker, 'VRTon team ');
    assert.equal(block.rows[0].activities.main.image, ' /images/welcome.png ');
    assert.equal(block.rows[0].activities.main.imageAlt, 'Welcome image ');
  });

  it('trims editable whitespace on save without changing internal spaces', () => {
    const [serialized] = stripClientIds([normalizeItineraryBlock({
      type: 'itinerary',
      title: ' Event schedule ',
      columns: [
        { id: 'main', label: '' },
        { id: 'party', label: ' Party Instance ' },
      ],
      rows: [{
        startTime: '12:00',
        endTime: '13:00',
        activities: {
          main: {
            title: 'Community Welcome ',
            description: 'Welcome to the event ',
            speaker: ' VRTon Team ',
            image: ' /images/welcome.png ',
            imageAlt: ' Welcome image ',
          },
          party: null,
        },
      }],
    }, { preserveEditableWhitespace: true })]);

    assert.equal(serialized.title, 'Event schedule');
    assert.equal(serialized.columns[0].label, 'Main Instance');
    assert.equal(serialized.columns[1].label, 'Party Instance');
    assert.equal(serialized.rows[0].activities.main.title, 'Community Welcome');
    assert.equal(serialized.rows[0].activities.main.description, 'Welcome to the event');
    assert.equal(serialized.rows[0].activities.main.speaker, 'VRTon Team');
    assert.equal(serialized.rows[0].activities.main.image, '/images/welcome.png');
    assert.equal(serialized.rows[0].activities.main.imageAlt, 'Welcome image');
  });

  it('creates a blank row with two empty cells', () => {
    assert.deepEqual(createEmptyItineraryRow(), {
      startTime: '',
      endTime: '',
      activities: { main: null, party: null },
    });
  });

  it('serializes normalized itinerary data without editor ids', () => {
    const [serialized] = stripClientIds([{
      _cid: 'client-only',
      type: 'itinerary',
      columns: [
        { id: 'main', label: 'Main' },
        { id: 'party', label: 'Party' },
      ],
      rows: [],
    }]);
    assert.equal(serialized._cid, undefined);
    assert.deepEqual(serialized.columns.map((column) => column.id), ['main', 'party']);
  });

  it('reconstructs column, row, and activity edits after a CMS save roundtrip', () => {
    const draft = {
      ...createDefaultBlock('itinerary'),
      columns: [
        { id: 'main', label: 'Escenario principal' },
        { id: 'party', label: 'Zona de fiesta' },
      ],
      rows: [{
        _rid: 'editor-row',
        startTime: '14:00',
        endTime: '15:00',
        activities: {
          main: {
            title: 'Panel',
            description: 'Preguntas y respuestas',
            speaker: 'VRTon',
            icon: 'panel',
          },
          party: null,
        },
      }],
    };

    const [saved] = stripClientIds([{ ...draft, _cid: 'editor-block' }]);
    const reconstructed = normalizeItineraryBlock(JSON.parse(JSON.stringify(saved)));

    assert.equal(reconstructed.columns[0].label, 'Escenario principal');
    assert.equal(reconstructed.columns[1].label, 'Zona de fiesta');
    assert.equal(reconstructed.rows[0].startTime, '14:00');
    assert.equal(reconstructed.rows[0].activities.main.title, 'Panel');
    assert.equal(reconstructed.rows[0].activities.party, null);
    assert.equal(reconstructed._cid, undefined);
    assert.equal(reconstructed.rows[0]._rid, undefined);
  });
});
