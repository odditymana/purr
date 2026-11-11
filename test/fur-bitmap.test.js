import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FUR_BITMAP, rasterPlan, localUrlRef } from '../js/logic/fur-bitmap.js';

const box = { x: 100.3, y: 50.2, width: 200, height: 80 };

test('外接矩形のまわりに余白を足した範囲を、倍率どおりの画素数で描く', () => {
  const plan = rasterPlan(box, 2, undefined, { ...FUR_BITMAP, margin: 10 });
  assert.ok(plan.x <= box.x - 10 && plan.y <= box.y - 10);
  assert.ok(plan.x + plan.width >= box.x + box.width + 10);
  assert.ok(plan.y + plan.height >= box.y + box.height + 10);
  assert.equal(plan.pixelWidth, Math.round(plan.width * 2));
  assert.equal(plan.pixelHeight, Math.round(plan.height * 2));
  assert.equal(plan.scale, 2);
});

test('範囲の端は、画面の画素の境目にそろう（猫の座標の原点が画素の途中にあっても）', () => {
  const s = 2.7, offset = { x: 123.4, y: 56.78 };
  const plan = rasterPlan(box, s, offset);
  for (const [v, o] of [[plan.x, offset.x], [plan.y, offset.y], [plan.x + plan.width, offset.x], [plan.y + plan.height, offset.y]]) {
    const px = v * s + o;
    assert.ok(Math.abs(px - Math.round(px)) < 1e-6, String(px));
  }
});

test('倍率が上がると画素数も増える（ぼやけない）', () => {
  const a = rasterPlan(box, 1.5), b = rasterPlan(box, 4.5);
  assert.ok(Math.abs(b.pixelWidth / a.pixelWidth - 3) < 0.05);
});

test('画素数が上限を超えるときは、収まるまで解像度を下げる', () => {
  const plan = rasterPlan({ x: 0, y: 0, width: 800, height: 400 }, 20, undefined, { ...FUR_BITMAP, maxPixels: 1000 * 1000 });
  assert.ok(plan.pixelWidth * plan.pixelHeight <= 1000 * 1000);
  assert.ok(plan.scale < 20);
});

test('url(...) を同じ文書の中の参照に直す', () => {
  assert.equal(localUrlRef('url("#fur-base")'), 'url(#fur-base)');
  assert.equal(localUrlRef('url("http://192.168.3.35:8000/index.html#fur-base")'), 'url(#fur-base)');
  assert.equal(localUrlRef("url('#mask-body')"), 'url(#mask-body)');
  assert.equal(localUrlRef('rgb(0, 0, 0)'), 'rgb(0, 0, 0)');
  assert.equal(localUrlRef('none'), 'none');
  assert.equal(localUrlRef(undefined), undefined);
});
