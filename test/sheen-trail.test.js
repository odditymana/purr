import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SHEEN, speedRatio, strandPositions, strandShape, fadeFactor, pruneStrands,
} from '../js/logic/sheen-trail.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
const half = () => 0.5; // 横にずらさない乱数

test('速さの割合は、ゆっくりで 0、速いと 1、あいだはなめらか', () => {
  assert.equal(speedRatio(0), 0);
  assert.equal(speedRatio(SHEEN.slowSpeed), 0);
  assert.equal(speedRatio((SHEEN.slowSpeed + SHEEN.fastSpeed) / 2), 0.5);
  assert.equal(speedRatio(SHEEN.fastSpeed * 3), 1);
});

test('間隔ごとに毛筋の位置を置き、余りを返す', () => {
  const { points, carry } = strandPositions({ x: 0, y: 0 }, { x: 20, y: 0 }, 0, 6);
  assert.deepEqual(points.map((p) => p.x), [6, 12, 18]);
  assert.ok(near(carry, 2));
});

test('余りを持ち越して、区間をまたいでも同じ間隔になる', () => {
  const first = strandPositions({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 6); // 6 に置き、余り 4
  const second = strandPositions({ x: 10, y: 0 }, { x: 20, y: 0 }, first.carry, 6);
  assert.deepEqual(second.points.map((p) => p.x), [12, 18]);
});

test('間隔より短い動きでは置かず、余りを貯める', () => {
  const { points, carry } = strandPositions({ x: 0, y: 0 }, { x: 0, y: 3 }, 1, 6);
  assert.equal(points.length, 0);
  assert.ok(near(carry, 4));
});

test('毛筋は撫でた向きにそろい、中心が置いた位置に来る', () => {
  const s = strandShape({ x: 100, y: 50 }, { x: 3, y: 4 }, SHEEN.slowSpeed, half);
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  assert.ok(near(dx / Math.hypot(dx, dy), 0.6) && near(dy / Math.hypot(dx, dy), 0.8));
  assert.ok(near((s.x1 + s.x2) / 2, 100) && near((s.y1 + s.y2) / 2, 50));
});

test('ゆっくり撫でると短く濃く、速く撫でると長く薄い', () => {
  const slow = strandShape({ x: 0, y: 0 }, { x: 1, y: 0 }, 0, half);
  const fast = strandShape({ x: 0, y: 0 }, { x: 1, y: 0 }, 5000, half);
  assert.ok(near(slow.x2 - slow.x1, SHEEN.slowLength) && slow.opacity === SHEEN.slowOpacity);
  assert.ok(near(fast.x2 - fast.x1, SHEEN.fastLength) && fast.opacity === SHEEN.fastOpacity);
});

test('横へのずれは、撫でた向きに直角で、最大の量を超えない', () => {
  for (const r of [0, 0.999999]) {
    const s = strandShape({ x: 0, y: 0 }, { x: 1, y: 0 }, 0, () => r);
    assert.ok(near(s.y1, s.y2)); // 横向きに撫でたので、ずれは縦だけ
    assert.ok(Math.abs(s.y1) <= SHEEN.jitter);
  }
});

test('向きが 0 でも壊れない', () => {
  const s = strandShape({ x: 5, y: 5 }, { x: 0, y: 0 }, 0, half);
  assert.ok(Number.isFinite(s.x1) && Number.isFinite(s.y2));
});

test('消え方：はじめは 1、時間が来たら 0、途中はだんだん薄く', () => {
  assert.equal(fadeFactor(0, 1500), 1);
  assert.equal(fadeFactor(1500, 1500), 0);
  assert.equal(fadeFactor(2000, 1500), 0);
  assert.ok(near(fadeFactor(750, 1500), 0.75));
  assert.ok(fadeFactor(300, 1500) > fadeFactor(900, 1500));
});

test('消え終わったものと、上限を超えた古いものを捨てる', () => {
  const strands = [{ born: 0 }, { born: 500 }, { born: 900 }, { born: 1000 }];
  assert.deepEqual(pruneStrands(strands, 1600, 1500).map((s) => s.born), [500, 900, 1000]);
  assert.deepEqual(pruneStrands(strands, 1000, 1500, 2).map((s) => s.born), [900, 1000]);
});
