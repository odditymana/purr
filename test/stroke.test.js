import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STROKE, strokePartOf, shapeNameFromHref, distance, addSample, strokeSpeed, isStroking,
} from '../js/logic/stroke.js';
import { PARTS } from '../js/logic/cat-parts.js';

test('形の名前を撫でる部位にまとめる（顔のパーツと耳は頭）', () => {
  for (const name of ['head', 'earFar', 'earNear', 'eye', 'nose', 'mouth', 'whiskers']) {
    assert.equal(strokePartOf(name), 'head', name);
  }
  assert.equal(strokePartOf('body'), 'body');
  assert.equal(strokePartOf('belly'), 'belly');
  assert.equal(strokePartOf('tail'), 'tail');
  assert.equal(strokePartOf('frontLegs'), 'frontLegs');
});

test('すべての部位が、撫でる部位のどれかにまとまる', () => {
  for (const name of PARTS) assert.ok(strokePartOf(name), name);
});

test('猫の部位でないものは null', () => {
  assert.equal(strokePartOf(undefined), null);
  assert.equal(strokePartOf('paper'), null);
});

test('href から形の名前を取り出す', () => {
  assert.equal(shapeNameFromHref('#shape-nose'), 'nose');
  assert.equal(shapeNameFromHref('#fur'), null);
  assert.equal(shapeNameFromHref(null), null);
});

test('2点の距離', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('記録を足すと、時間の幅より古いものは捨てる', () => {
  const samples = [{ x: 0, y: 0, t: 0 }, { x: 1, y: 0, t: 50 }];
  const next = addSample(samples, { x: 2, y: 0, t: 160 }, 120);
  assert.deepEqual(next.map((s) => s.t), [50, 160]);
  assert.equal(samples.length, 2); // 元の配列は変えない
});

test('速さは、記録の道のりを経過時間で割った値（単位／秒）', () => {
  const samples = [{ x: 0, y: 0, t: 0 }, { x: 30, y: 40, t: 50 }, { x: 30, y: 70, t: 100 }];
  assert.equal(strokeSpeed(samples), 800); // 80 を 0.1 秒
});

test('記録が1つだけか、時間が進んでいなければ速さは 0', () => {
  assert.equal(strokeSpeed([{ x: 0, y: 0, t: 0 }]), 0);
  assert.equal(strokeSpeed([{ x: 0, y: 0, t: 10 }, { x: 5, y: 0, t: 10 }]), 0);
});

test('決めた距離を動いたら撫でているとみなす', () => {
  assert.equal(isStroking(STROKE.startDistance - 0.1), false);
  assert.equal(isStroking(STROKE.startDistance), true);
  assert.equal(isStroking(3, { ...STROKE, startDistance: 2 }), true);
});
