import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WHISKER_SWAY, followKeyframes, swayAmplitude, swayKeyframes, bundleAt,
} from '../js/logic/whisker-sway.js';

const degOf = (frame) => Number(/rotate\((-?[\d.]+)deg\)/.exec(frame.transform)[1]);

test('耳につられる動きは 0° で始まって 0° で終わり、寄りきる時刻は寄る時間の比で決まる', () => {
  const { durationMs, delayMs, upper, lower } = followKeyframes();
  const { moveMs, returnMs } = WHISKER_SWAY.follow;
  assert.equal(durationMs, moveMs + returnMs);
  assert.equal(delayMs, WHISKER_SWAY.follow.delayMs);
  for (const frames of [upper, lower]) {
    assert.equal(degOf(frames[0]), 0);
    assert.equal(degOf(frames.at(-1)), 0);
    assert.equal(frames[1].offset, moveMs / durationMs);
  }
});

test('耳につられる動きは、上の束が設定の角度、下の束はその割合だけ、逆の向きに寄る', () => {
  const { upper, lower } = followKeyframes();
  const { angleDeg, lowerRatio } = WHISKER_SWAY.follow;
  assert.equal(degOf(upper[1]), angleDeg);
  assert.equal(degOf(lower[1]), -angleDeg * lowerRatio);
});

test('角度を変えると、寄る角度もそのまま変わる（実機で 6〜8° に上げる場合）', () => {
  const config = { ...WHISKER_SWAY, follow: { ...WHISKER_SWAY.follow, angleDeg: 7 } };
  const { upper, lower } = followKeyframes(config);
  assert.equal(degOf(upper[1]), 7);
  assert.equal(degOf(lower[1]), -7 * WHISKER_SWAY.follow.lowerRatio);
});

test('揺れの振れ幅は、撫でる速さに応じて minDeg〜maxDeg に収まる', () => {
  const { minDeg, maxDeg, fastSpeed } = WHISKER_SWAY.sway;
  assert.equal(swayAmplitude(0), minDeg);
  assert.equal(swayAmplitude(-50), minDeg);
  assert.equal(swayAmplitude(fastSpeed), maxDeg);
  assert.equal(swayAmplitude(fastSpeed * 3), maxDeg);
  const mid = swayAmplitude(fastSpeed / 2);
  assert.ok(mid > minDeg && mid < maxDeg);
});

test('揺れは 0° で始まって 0° で終わり、振れ幅を超えない', () => {
  const { durationMs, keyframes } = swayKeyframes(2);
  assert.equal(durationMs, WHISKER_SWAY.sway.durationMs);
  assert.equal(keyframes.length, WHISKER_SWAY.sway.steps + 1);
  assert.equal(keyframes[0].offset, 0);
  assert.equal(keyframes.at(-1).offset, 1);
  assert.equal(degOf(keyframes[0]), 0);
  assert.equal(degOf(keyframes.at(-1)), 0);
  for (const frame of keyframes) assert.ok(Math.abs(degOf(frame)) <= 2);
});

test('揺れは、回を追って小さくなる（ぴんと跳ねず、空気で揺れて収まる）', () => {
  const { keyframes } = swayKeyframes(2);
  // 半周期ごとの、いちばん大きい振れ
  const { cycles, steps } = WHISKER_SWAY.sway;
  const perHalf = steps / (cycles * 2);
  const peaks = [];
  for (let start = 0; start + perHalf <= steps; start += perHalf) {
    const slice = keyframes.slice(Math.round(start), Math.round(start + perHalf) + 1);
    peaks.push(Math.max(...slice.map((f) => Math.abs(degOf(f)))));
  }
  assert.ok(peaks.length >= 3);
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] < peaks[i - 1], `${i} 回目の振れが前より小さくない`);
});

test('撫でている位置が鼻の高さより上なら上の束、下なら下の束を揺らす', () => {
  const { splitY } = WHISKER_SWAY;
  assert.equal(bundleAt(splitY - 1), 'upper');
  assert.equal(bundleAt(120), 'upper');
  assert.equal(bundleAt(splitY), 'lower');
  assert.equal(bundleAt(330), 'lower');
});
