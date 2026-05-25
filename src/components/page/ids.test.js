import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { makeId, makeItemId, makeRowId, makeColumnId, makeCollaboratorId } from './ids.js';

describe('ids', () => {
  describe('makeId', () => {
    it('generates unique ids', () => {
      const id1 = makeId();
      const id2 = makeId();
      assert.notStrictEqual(id1, id2);
    });

    it('starts with block- prefix', () => {
      const id = makeId();
      assert.ok(id.startsWith('block-'));
    });

    it('contains timestamp and random parts', () => {
      const id = makeId();
      const parts = id.split('-');
      assert.ok(parts.length >= 3);
    });
  });

  describe('makeItemId', () => {
    it('generates unique ids', () => {
      const id1 = makeItemId();
      const id2 = makeItemId();
      assert.notStrictEqual(id1, id2);
    });

    it('starts with item- prefix', () => {
      const id = makeItemId();
      assert.ok(id.startsWith('item-'));
    });
  });

  describe('makeRowId', () => {
    it('starts with row- prefix', () => {
      const id = makeRowId();
      assert.ok(id.startsWith('row-'));
    });

    it('generates unique ids', () => {
      const id1 = makeRowId();
      const id2 = makeRowId();
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('makeColumnId', () => {
    it('starts with col- prefix', () => {
      const id = makeColumnId();
      assert.ok(id.startsWith('col-'));
    });

    it('generates unique ids', () => {
      const id1 = makeColumnId();
      const id2 = makeColumnId();
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('makeCollaboratorId', () => {
    it('normalizes name to lowercase', () => {
      const id = makeCollaboratorId('John Doe');
      assert.strictEqual(id, 'john-doe');
    });

    it('removes special characters', () => {
      const id = makeCollaboratorId('José María!@#');
      assert.strictEqual(id, 'jos-mara');
    });

    it('uses fallback when name is empty', () => {
      const id = makeCollaboratorId('', 'user1');
      assert.ok(id.startsWith('collab-'));
    });

    it('trims hyphens from edges', () => {
      const id = makeCollaboratorId('  test  ');
      assert.strictEqual(id, 'test');
    });
  });
});