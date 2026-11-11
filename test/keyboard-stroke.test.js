import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  KEYBOARD_STROKE, keyAction, routeLength, pointAt, advance, nextRoute, nearestDistance,
} from '../js/logic/keyboard-stroke.js';

// 長さ 100 の横線と、長さ 50 の縦線をつないだ L 字
const L = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];

test('矢印キーの割り当て：左右で進み、上下で道すじを替える', () => {
  assert.deepEqual(keyAction('ArrowRight'), { type: 'move', direction: 1 });
  assert.deepEqual(keyAction('ArrowLeft'), { type: 'move', direction: -1 });
  assert.deepEqual(keyAction('ArrowUp'), { type: 'route', step: -1 });
  assert.deepEqual(keyAction('ArrowDown'), { type: 'route', step: 1 });
  assert.equal(keyAction('a'), null);
  assert.equal(keyAction(' '), null);
});

test('折れ線の長さ', () => {
  assert.equal(routeLength(L), 150);
  assert.equal(routeLength([{ x: 3, y: 4 }]), 0);
});

test('始点からの距離で、道すじの上の点が決まる', () => {
  assert.deepEqual(pointAt(L, 0), { x: 0, y: 0 });
  assert.deepEqual(pointAt(L, 40), { x: 40, y: 0 });
  assert.deepEqual(pointAt(L, 100), { x: 100, y: 0 });
  assert.deepEqual(pointAt(L, 125), { x: 100, y: 25 });
});

test('道すじの外の距離は、端の点になる', () => {
  assert.deepEqual(pointAt(L, -10), { x: 0, y: 0 });
  assert.deepEqual(pointAt(L, 999), { x: 100, y: 50 });
});

test('押している時間ぶん、決めた速さで進む（左右で向きが逆）', () => {
  const config = { ...KEYBOARD_STROKE, speed: 200 };
  assert.equal(advance(50, 1, 50, 150, config), 60);
  assert.equal(advance(50, -1, 50, 150, config), 40);
  assert.equal(advance(50, 1, 0, 150, config), 50);
});

test('道すじの端で止まる', () => {
  const config = { ...KEYBOARD_STROKE, speed: 200 };
  assert.equal(advance(145, 1, 50, 150, config), 150);
  assert.equal(advance(5, -1, 50, 150, config), 0);
});

test('1回に進める時間には上限がある（タブが隠れていたあとに飛ばない）', () => {
  const config = { ...KEYBOARD_STROKE, speed: 100, maxStepMs: 100 };
  assert.equal(advance(0, 1, 5000, 1000, config), 10);
  assert.equal(advance(20, 1, -30, 1000, config), 20);
});

test('道すじを替えるときは、いちばん上・下で止まる', () => {
  assert.equal(nextRoute(0, 1, 3), 1);
  assert.equal(nextRoute(2, 1, 3), 2);
  assert.equal(nextRoute(0, -1, 3), 0);
  assert.equal(nextRoute(1, -1, 3), 0);
});

test('道すじの上で、いちばん近い位置を求める', () => {
  assert.equal(nearestDistance(L, { x: 30, y: -20 }), 30);
  assert.equal(nearestDistance(L, { x: 130, y: 30 }), 130);
  assert.equal(nearestDistance(L, { x: -50, y: 0 }), 0);
  assert.equal(nearestDistance(L, { x: 200, y: 200 }), 150);
});

test('近い位置の点を求め直すと、もとの道すじの上の点に戻る', () => {
  for (const d of [0, 33, 100, 149]) {
    assert.ok(Math.abs(nearestDistance(L, pointAt(L, d)) - d) < 1e-9, String(d));
  }
});

test('道すじは上・まん中・下の3本で、どれも猫の SVG の中にある', () => {
  assert.deepEqual(KEYBOARD_STROKE.routes.map((r) => r.name), ['back', 'belly', 'tail']);
  for (const { name, points } of KEYBOARD_STROKE.routes) {
    assert.ok(points.length >= 2, name);
    assert.ok(routeLength(points) > 100, name);
    for (const p of points) assert.ok(p.x > 0 && p.x < 800 && p.y > 0 && p.y < 400, name);
  }
});

test('どの道すじも、→（終点へ進む向き）で画面の右へ、←で左へ進む', () => {
  const step = 5;
  for (const { name, points } of KEYBOARD_STROKE.routes) {
    const length = routeLength(points);
    for (let d = 0; d + step <= length; d += step) {
      const right = pointAt(points, advance(d, keyAction('ArrowRight').direction, 1000, length, { ...KEYBOARD_STROKE, speed: step, maxStepMs: 1000 }));
      const left = pointAt(points, advance(d + step, keyAction('ArrowLeft').direction, 1000, length, { ...KEYBOARD_STROKE, speed: step, maxStepMs: 1000 }));
      const here = pointAt(points, d), next = pointAt(points, d + step);
      assert.ok(right.x >= here.x, `${name} ${d}：→ で左へ戻っている`);
      assert.ok(left.x <= next.x, `${name} ${d}：← で右へ進んでいる`);
    }
    assert.ok(points[points.length - 1].x > points[0].x, name);
  }
});

test('道すじは上から下の順に並んでいる（平均の高さ）', () => {
  const avgY = (r) => r.points.reduce((s, p) => s + p.y, 0) / r.points.length;
  const ys = KEYBOARD_STROKE.routes.map(avgY);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i - 1] < ys[i]);
});
