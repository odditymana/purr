import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldBlockPan, UNZOOMED_SCALE } from '../js/logic/page-pan.js';

test('拡大していないときの指1本のスワイプは止める', () => {
  assert.equal(shouldBlockPan({ touchCount: 1, scale: 1 }), true);
});

test('ピンチのあと 1 ちょうどに戻らなくても、ほぼ等倍なら止める', () => {
  assert.equal(shouldBlockPan({ touchCount: 1, scale: UNZOOMED_SCALE }), true);
});

test('指2本以上（ピンチ）は止めない', () => {
  assert.equal(shouldBlockPan({ touchCount: 2, scale: 1 }), false);
  assert.equal(shouldBlockPan({ touchCount: 3, scale: 1 }), false);
});

test('拡大しているときは、指1本でも止めない（拡大した画面を見て回れるように）', () => {
  assert.equal(shouldBlockPan({ touchCount: 1, scale: 1.5 }), false);
});

test('倍率が分からないときは、拡大していないものとして扱う', () => {
  assert.equal(shouldBlockPan({ touchCount: 1 }), true);
  assert.equal(shouldBlockPan({ touchCount: 2 }), false);
});

test('指が触れていなければ止めない', () => {
  assert.equal(shouldBlockPan({ touchCount: 0, scale: 1 }), false);
});
