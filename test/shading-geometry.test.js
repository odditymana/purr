import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SHADING, placeEllipse, padBox } from '../js/logic/shading-geometry.js';
import { PARTS } from '../js/logic/cat-parts.js';

const box = { x: 100, y: 50, width: 200, height: 80 };

test('割合から楕円の中心と半径を求める', () => {
  const geo = placeEllipse(box, { cx: 0.25, cy: 0.5, rx: 0.1, ry: 0.25, rotate: 0 });
  assert.deepEqual(geo, { cx: 150, cy: 90, rx: 20, ry: 20, transform: null });
});

test('割合 0 と 1 は外接矩形の端になる', () => {
  const geo = placeEllipse(box, { cx: 1, cy: 0, rx: 0, ry: 0, rotate: 0 });
  assert.equal(geo.cx, 300);
  assert.equal(geo.cy, 50);
});

test('回転は楕円の中心を軸にする', () => {
  const geo = placeEllipse(box, { cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1, rotate: -15 });
  assert.equal(geo.transform, 'rotate(-15 200 90)');
});

test('余白を四方に足す', () => {
  assert.deepEqual(padBox(box, 10), { x: 90, y: 40, width: 220, height: 100 });
});

test('SHADING の表は、実在する部位と正しい種類・数値だけでできている', () => {
  for (const [name, specs] of Object.entries(SHADING)) {
    assert.ok(PARTS.includes(name), `${name} は部位の一覧にない`);
    for (const spec of specs) {
      assert.ok(['sheen', 'shade'].includes(spec.type), `${name}：type が ${spec.type}`);
      for (const key of ['cx', 'cy', 'rx', 'ry', 'rotate', 'opacity']) {
        assert.equal(typeof spec[key], 'number', `${name}：${key} が数値でない`);
      }
      assert.ok(spec.rx > 0 && spec.ry > 0, `${name}：半径が 0 以下`);
      assert.ok(spec.opacity > 0 && spec.opacity <= 1, `${name}：opacity が範囲外`);
    }
  }
});
