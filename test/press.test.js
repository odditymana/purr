import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PRESS, approach, approachDuration, dentArea } from '../js/logic/press.js';

test('時間が経つほど目標に近づき、越えない', () => {
  const a = approach(0, 5, 20, 150);
  const b = approach(0, 5, 80, 150);
  assert.ok(a > 0 && a < b && b < 5);
});

test('決めた時間で、ほぼ 95% まで進む', () => {
  const v = approach(0, 1, 150, 150);
  assert.ok(Math.abs(v - (1 - Math.exp(-3))) < 1e-9);
});

test('目標にごく近づいたら目標の値になる', () => {
  assert.equal(approach(4.995, 5, 1, 150), 5);
  assert.equal(approach(0.005, 0, 1, 600), 0);
});

test('時間が 0 なら、すぐ目標になる', () => {
  assert.equal(approach(3, 0, 16, 0), 0);
});

test('沈むときは速く、戻るときはゆっくり（動きを減らす設定では短く）', () => {
  assert.equal(approachDuration(0, PRESS.depth), PRESS.pressMs);
  assert.equal(approachDuration(PRESS.depth, 0), PRESS.releaseMs);
  assert.equal(approachDuration(PRESS.depth, 0, { reducedMotion: true }), PRESS.reducedReleaseMs);
  assert.ok(PRESS.pressMs < PRESS.releaseMs);
});

test('撫でている点を中心にした、地図の画像の範囲', () => {
  assert.deepEqual(dentArea({ x: 300, y: 120 }, 40), { x: 260, y: 80, width: 80, height: 80 });
});
