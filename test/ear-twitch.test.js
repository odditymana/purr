import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EAR_TWITCH, planTwitch, twitchKeyframes } from '../js/logic/ear-twitch.js';

// 渡した値を順に返す乱数
const sequence = (...values) => {
  let i = 0;
  return () => values[i++];
};

test('待ち時間は乱数に合わせて、最小から最大のあいだで決まる', () => {
  assert.equal(planTwitch(sequence(0, 0.9)).delayMs, 6000);
  assert.equal(planTwitch(sequence(0.5, 0.9)).delayMs, 10500);
});

test('乱数が 1 に近くても、待ち時間は最大を超えない', () => {
  const { delayMs } = planTwitch(sequence(0.999999, 0.9));
  assert.ok(delayMs >= EAR_TWITCH.minIntervalMs && delayMs <= EAR_TWITCH.maxIntervalMs);
});

test('2回続けるかは、2つ目の乱数が確率より小さいかで決まる', () => {
  assert.equal(planTwitch(sequence(0.5, 0.1)).count, 2);
  assert.equal(planTwitch(sequence(0.5, 0.25)).count, 1); // ちょうど確率の値は1回
  assert.equal(planTwitch(sequence(0.5, 0.8)).count, 1);
});

test('設定を渡して計算できる', () => {
  const config = { ...EAR_TWITCH, minIntervalMs: 1000, maxIntervalMs: 2000, doubleChance: 1 };
  assert.deepEqual(planTwitch(sequence(0.25, 0.99), config), { delayMs: 1250, count: 2 });
});

test('キーフレームは 0° → 倒れる → 0° で、倒れるところの区切りは時間の比で決まる', () => {
  const { durationMs, keyframes } = twitchKeyframes({ ...EAR_TWITCH, angleDeg: 10, downMs: 200, upMs: 300 });
  assert.equal(durationMs, 500);
  assert.deepEqual(keyframes.map((k) => k.transform), ['rotate(0deg)', 'rotate(10deg)', 'rotate(0deg)']);
  assert.deepEqual(keyframes.map((k) => k.offset), [0, 0.4, 1]);
});

test('倒れる時間は戻る時間より短い（素早く倒れて、ゆっくり戻る）', () => {
  assert.ok(EAR_TWITCH.downMs < EAR_TWITCH.upMs);
});
