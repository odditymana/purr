import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planTwitch, twitchKeyframes } from '../js/logic/twitch.js';

// 渡した値を順に返す乱数
const sequence = (...values) => {
  let i = 0;
  return () => values[i++];
};

const config = {
  minIntervalMs: 6000,
  maxIntervalMs: 15000,
  doubleChance: 0.25,
  doubleGapMs: 350,
  angleDeg: 12,
  moveMs: 170,
  returnMs: 350,
};

test('待ち時間は乱数に合わせて、最小から最大のあいだで決まる', () => {
  assert.equal(planTwitch(sequence(0, 0.9), config).delayMs, 6000);
  assert.equal(planTwitch(sequence(0.5, 0.9), config).delayMs, 10500);
});

test('乱数が 1 に近くても、待ち時間は最大を超えない', () => {
  const { delayMs } = planTwitch(sequence(0.999999, 0.9), config);
  assert.ok(delayMs >= config.minIntervalMs && delayMs <= config.maxIntervalMs);
});

test('2回続けるかは、2つ目の乱数が確率より小さいかで決まる', () => {
  assert.equal(planTwitch(sequence(0.5, 0.1), config).count, 2);
  assert.equal(planTwitch(sequence(0.5, 0.25), config).count, 1); // ちょうど確率の値は1回
  assert.equal(planTwitch(sequence(0.5, 0.8), config).count, 1);
});

test('値を変えると、それに合わせて計算する', () => {
  const custom = { ...config, minIntervalMs: 1000, maxIntervalMs: 2000, doubleChance: 1 };
  assert.deepEqual(planTwitch(sequence(0.25, 0.99), custom), { delayMs: 1250, count: 2 });
});

test('キーフレームは 0° → 動く → 0° で、動くところの区切りは時間の比で決まる', () => {
  const { durationMs, keyframes } = twitchKeyframes({ ...config, angleDeg: 10, moveMs: 200, returnMs: 300 });
  assert.equal(durationMs, 500);
  assert.deepEqual(keyframes.map((k) => k.transform), ['rotate(0deg)', 'rotate(10deg)', 'rotate(0deg)']);
  assert.deepEqual(keyframes.map((k) => k.offset), [0, 0.4, 1]);
});
