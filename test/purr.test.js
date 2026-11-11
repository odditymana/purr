import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PURR, purrLevel, levelToGain, pulseRate, pulsePlaybackRate, resumeStrokeTime, parseCssSeconds,
  pinkNoise, grainShape, planGrains, grainEnvelopes, toneWaveCoefficients,
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

test('刻みの速さを再生速度に直す（速く撫でても +8% ほどまで）', () => {
  assert.equal(pulsePlaybackRate(PURR.slowPulseHz), 1);
  assert.ok(pulsePlaybackRate(PURR.fastPulseHz) <= 1.081);
});

test('ノイズは長さどおりで、いちばん大きい値が 1 にそろう', () => {
  const data = pinkNoise(4000, seeded(1));
  assert.equal(data.length, 4000);
  const peak = Math.max(...data.map(Math.abs));
  assert.ok(Math.abs(peak - 1) < 1e-6);
});

test('同じ乱数なら、同じノイズになる', () => {
  assert.deepEqual(pinkNoise(100, seeded(7)), pinkNoise(100, seeded(7)));
});

test('粒は、少し鋭く立ち上がり、速く減衰する', () => {
  const a = PURR.grainAttackMs / 1000;
  assert.equal(grainShape(-0.001), 0);
  assert.equal(grainShape(a), 1);
  assert.ok(grainShape(a / 2) > 0.4 && grainShape(a / 2) < 0.6);
  // 立ち上がり（3ms）より、減衰して半分になるまでのほうが長い。それでも 30ms で 2 割を切る
  assert.ok(grainShape(a + 0.005) > 0.5);
  assert.ok(grainShape(a + 0.03) < 0.2);
});

const BREATH = 4.5;

test('粒の数は、およそ「刻み × 鳴っている時間」', () => {
  const grains = planGrains(BREATH, seeded(2));
  const gapTotal = (PURR.gapMs / 1000) * 2 * PURR.breathsPerLoop;
  const expected = PURR.slowPulseHz * (BREATH * PURR.breathsPerLoop - gapTotal);
  assert.ok(Math.abs(grains.length - expected) < expected * 0.05, `${grains.length} / ${expected}`);
});

test('粒の間隔と強さのばらつきは、決めた範囲に収まる', () => {
  const grains = planGrains(BREATH, seeded(3));
  const base = 1 / PURR.slowPulseHz;
  for (let i = 1; i < grains.length; i++) {
    const d = grains[i].time - grains[i - 1].time;
    if (grains[i].phase !== grains[i - 1].phase) continue; // 切り替わりのすき間はとばす
    assert.ok(d >= base * (1 - PURR.intervalJitter) - 1e-9 && d <= base * (1 + PURR.intervalJitter) + 1e-9);
  }
  const maxAmp = (1 + PURR.breathLevelJitter) * PURR.exhaleLevel * (1 + PURR.amplitudeJitter);
  assert.ok(grains.every((g) => g.amplitude >= 0 && g.amplitude <= maxAmp + 1e-9));
});

test('ばらつきは毎回同じではない（間隔がそろいすぎていない）', () => {
  const grains = planGrains(BREATH, seeded(4)).filter((g) => g.phase === 'exhale');
  const gaps = new Set(grains.slice(1, 20).map((g, i) => (g.time - grains[i].time).toFixed(4)));
  assert.ok(gaps.size > 10);
});

test('吸うときは吐くときより小さい', () => {
  const grains = planGrains(BREATH, seeded(5));
  const avg = (phase) => {
    const list = grains.filter((g) => g.phase === phase);
    return list.reduce((a, g) => a + g.amplitude, 0) / list.length;
  };
  assert.ok(avg('inhale') < avg('exhale') * 0.85);
});

test('吸う・吐くの切り替わりには、粒の鳴らないすき間がある', () => {
  const grains = planGrains(BREATH, seeded(6));
  const switchAt = BREATH * PURR.inhaleRatio;
  const near = grains.filter((g) => Math.abs(g.time - switchAt) < PURR.gapMs / 2000);
  assert.equal(near.length, 0);
  const atLoopStart = grains.filter((g) => g.time < PURR.gapMs / 2000);
  assert.equal(atLoopStart.length, 0);
});

test('包絡：吸う側と吐く側は重ならず、すき間の真ん中では 0', () => {
  const rate = 8000;
  const grains = planGrains(BREATH, seeded(8));
  const { inhale, exhale } = grainEnvelopes(grains, BREATH * PURR.breathsPerLoop, rate);
  assert.equal(inhale.length, Math.round(BREATH * PURR.breathsPerLoop * rate));
  let overlap = 0;
  for (let i = 0; i < inhale.length; i++) if (inhale[i] > 0.01 && exhale[i] > 0.01) overlap++;
  assert.ok(overlap < inhale.length * 0.002, `重なり ${overlap}`);
  const mid = Math.round((BREATH * PURR.inhaleRatio + PURR.gapMs / 2000 - 0.001) * rate);
  assert.ok(exhale[mid] < 0.02 && inhale[mid] < 0.05);
});

test('同じ乱数なら、同じ粒の並びになる', () => {
  assert.deepEqual(planGrains(BREATH, seeded(9)), planGrains(BREATH, seeded(9)));
});

test('並びは何呼吸ぶんもあり、呼吸ごとに同じ並びの繰り返しではない', () => {
  const grains = planGrains(BREATH, seeded(10));
  assert.ok(PURR.breathsPerLoop >= 3);
  const firstOf = (b) => grains.filter((g) => g.time >= b * BREATH && g.time < (b + 1) * BREATH)
    .slice(0, 10).map((g) => (g.time - b * BREATH).toFixed(4));
  assert.notDeepEqual(firstOf(0), firstOf(1));
});

test('音程の芯は、基音と 300 Hz までの倍音を持ち、ごく小さく混ぜるだけ', () => {
  assert.ok(PURR.toneMix < 0.2);
  const { real, imag } = toneWaveCoefficients();
  assert.equal(imag.length, PURR.harmonics.length + 1);
  assert.equal(imag[0], 0);
  assert.ok(real.every((v) => v === 0));
  assert.equal(PURR.baseHz * PURR.harmonics.length, 300);
});

test('主役のノイズの胸の帯域は、小さなスピーカーでも鳴る 100〜250 Hz にある', () => {
  assert.ok(PURR.bodyBandHz >= 100 && PURR.bodyBandHz <= 250);
});
