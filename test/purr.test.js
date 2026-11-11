import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PURR, purrLevel, levelToGain, pulseRate, resumeStrokeTime, parseCssSeconds, brownNoise, toneWaveCoefficients,
} from '../js/logic/purr.js';

// 決まった値を返す乱数（線形合同法）
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('撫で始めは鳴り始めの大きさ、撫で続けるといちばん大きくなる', () => {
  assert.equal(purrLevel(0, 0), PURR.startLevel);
  assert.equal(purrLevel(PURR.fullAfterMs, 0), 1);
  assert.equal(purrLevel(PURR.fullAfterMs * 5, 0), 1);
});

test('撫で続けるほど大きくなり、増え方はだんだんゆるやかになる', () => {
  const a = purrLevel(1000, 0), b = purrLevel(3000, 0), c = purrLevel(5000, 0);
  assert.ok(a < b && b < c);
  assert.ok(b - a > c - b);
});

test('速く撫でると少し大きくなるが、1 を超えない', () => {
  assert.ok(purrLevel(1000, PURR.fastSpeed) > purrLevel(1000, 0));
  assert.ok(Math.abs(purrLevel(1000, PURR.fastSpeed) - purrLevel(1000, 0) - PURR.speedBoost) < 1e-9);
  assert.equal(purrLevel(PURR.fullAfterMs, PURR.fastSpeed * 10), 1);
});

test('音量は大きさの2乗で、0 から最大の音量まで', () => {
  assert.equal(levelToGain(0), 0);
  assert.equal(levelToGain(1), PURR.maxGain);
  assert.equal(levelToGain(0.5), PURR.maxGain * 0.25);
  assert.equal(levelToGain(2), PURR.maxGain);
});

test('刻みの速さは、ゆっくりで最小、速く撫でると最大', () => {
  assert.equal(pulseRate(0), PURR.slowPulseHz);
  assert.equal(pulseRate(PURR.fastSpeed * 2), PURR.fastPulseHz);
  assert.ok(pulseRate(PURR.fastSpeed / 2) > PURR.slowPulseHz);
});

test('すぐ撫で直せば続きから、間があけば最初から', () => {
  assert.equal(resumeStrokeTime(5000, 800), 5000);
  assert.equal(resumeStrokeTime(5000, PURR.resumeWithinMs), 5000);
  assert.equal(resumeStrokeTime(5000, PURR.resumeWithinMs + 1), 0);
});

test('CSS の時間を秒に直す', () => {
  assert.equal(parseCssSeconds('4.5s', 1), 4.5);
  assert.equal(parseCssSeconds(' 4500ms ', 1), 4.5);
  assert.equal(parseCssSeconds('', 3), 3);
  assert.equal(parseCssSeconds('fast', 3), 3);
  assert.equal(parseCssSeconds('0s', 3), 3);
});

test('ノイズは長さどおりで、いちばん大きい値が 1 にそろう', () => {
  const data = brownNoise(4000, seeded(1));
  assert.equal(data.length, 4000);
  const peak = Math.max(...data.map(Math.abs));
  assert.ok(Math.abs(peak - 1) < 1e-6);
});

test('同じ乱数なら、同じノイズになる', () => {
  assert.deepEqual(brownNoise(100, seeded(7)), brownNoise(100, seeded(7)));
});

test('ノイズは低い音が多い（隣どうしの値が近い）', () => {
  const data = brownNoise(4000, seeded(3));
  let diff = 0;
  for (let i = 1; i < data.length; i++) diff += Math.abs(data[i] - data[i - 1]);
  assert.ok(diff / data.length < 0.1);
});

test('胸に響く成分は、基音と 300 Hz までの倍音を持つ', () => {
  const { real, imag } = toneWaveCoefficients();
  assert.equal(imag.length, PURR.harmonics.length + 1);
  assert.equal(imag[0], 0);
  assert.ok(real.every((v) => v === 0));
  assert.equal(PURR.baseHz * PURR.harmonics.length, 300);
  // 小さなスピーカー向けに、100〜300 Hz の倍音の合計が基音より強い
  const overtones = PURR.harmonics.slice(1).reduce((a, b) => a + b, 0);
  assert.ok(overtones > PURR.harmonics[0] * 3);
});
