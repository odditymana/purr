import { test } from 'node:test';
import assert from 'node:assert/strict';

import { whiskerFadeCircle } from '../js/logic/whisker-fade.js';

test('中心は鼻の外接矩形の中心', () => {
  const nose = { x: 230, y: 250, width: 20, height: 30 };
  const whiskers = { x: 200, y: 150, width: 100, height: 200 };
  const { cx, cy } = whiskerFadeCircle(nose, whiskers);
  assert.equal(cx, 240);
  assert.equal(cy, 265);
});

test('半径は中心から、ひげの外接矩形のいちばん遠い角までの距離', () => {
  const nose = { x: 0, y: 0, width: 0, height: 0 };
  const whiskers = { x: -10, y: -20, width: 40, height: 60 }; // 角は (-10,-20) (30,-20) (-10,40) (30,40)
  assert.equal(whiskerFadeCircle(nose, whiskers).r, 50); // (30,40) までの 3:4:5
});

test('上の束の先と下の束の先は、どちらも半径の内側に入る', () => {
  const nose = { x: 232, y: 256, width: 15, height: 20 };
  const whiskers = { x: 208, y: 152, width: 101, height: 189 };
  const { cx, cy, r } = whiskerFadeCircle(nose, whiskers);
  for (const [x, y] of [[259, 152], [309, 162], [208, 341], [270, 331]]) {
    assert.ok(Math.hypot(x - cx, y - cy) <= r);
  }
});
