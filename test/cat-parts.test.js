import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PARTS, compareIds } from '../js/logic/cat-parts.js';

test('すべての部位がそろっていれば、足りないものも想定外のものもない', () => {
  assert.deepEqual(compareIds(PARTS), { missing: [], unknown: [] });
});

test('足りない部位は PARTS の順に返す', () => {
  const ids = PARTS.filter((name) => name !== 'tail' && name !== 'hindLeg');
  assert.deepEqual(compareIds(ids).missing, ['hindLeg', 'tail']);
});

test('想定外の id を返す（Illustrator が名前を変えた場合など）', () => {
  const ids = [...PARTS.filter((name) => name !== 'tail'), 'tail_1_', 'Layer_1'];
  assert.deepEqual(compareIds(ids), { missing: ['tail'], unknown: ['tail_1_', 'Layer_1'] });
});

test('同じ id が重なっていても、想定外の id は1回だけ返す', () => {
  assert.deepEqual(compareIds([...PARTS, 'x', 'x']).unknown, ['x']);
});

test('部位の一覧を渡して照合できる', () => {
  assert.deepEqual(compareIds(['a', 'c'], ['a', 'b']), { missing: ['b'], unknown: ['c'] });
});
