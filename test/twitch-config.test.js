import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EAR_TWITCH } from '../js/logic/ear-twitch.js';
import { TAIL_FLICK, flashKeyframes } from '../js/logic/tail-flick.js';

// 耳としっぽの値の決まり（計算そのものは test/twitch.test.js）
for (const [name, config] of [['耳', EAR_TWITCH], ['しっぽ', TAIL_FLICK]]) {
  test(`${name}：待ち時間の範囲が正しい向き`, () => {
    assert.ok(config.minIntervalMs > 0 && config.minIntervalMs < config.maxIntervalMs);
  });

  test(`${name}：素早く動いて、少しゆっくり戻る`, () => {
    assert.ok(config.moveMs < config.returnMs);
  });

  test(`${name}：2回続く確率は 0〜1`, () => {
    assert.ok(config.doubleChance >= 0 && config.doubleChance <= 1);
  });
}

test('しっぽのツヤは、持ち上がりきる時刻にいちばん明るく、はじめと終わりは見えない', () => {
  const frames = flashKeyframes({ ...TAIL_FLICK, moveMs: 100, returnMs: 300, flashOpacity: 0.4 });
  assert.deepEqual(frames.map((k) => k.opacity), [0, 0.4, 0]);
  assert.deepEqual(frames.map((k) => k.offset), [0, 0.25, 1]);
});

test('しっぽのツヤは控えめ（不透明度 0.5 以下）', () => {
  assert.ok(TAIL_FLICK.flashOpacity > 0 && TAIL_FLICK.flashOpacity <= 0.5);
});

test('しっぽは、撫でているあいだに何度か動けるよう、耳より間隔が短い', () => {
  assert.ok(TAIL_FLICK.maxIntervalMs < EAR_TWITCH.minIntervalMs);
});
