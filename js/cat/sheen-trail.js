// 撫でた跡に、毛並みのツヤの筋（短い毛筋の並び）を出し、ゆっくり消す。
// - 毛筋は、毛のフィルターがかかったグループの中の層（.sheen-trails）に描く。
//   フィルターのノイズはグループに固定されたままなので、チラつかない。筋も毛になじむ
// - 層は猫の形の mask で切り抜いてあるので、形の外にはみ出さない
// - 動きを減らす設定のときは、短く消える
// 値と計算は js/logic/sheen-trail.js にある

import {
  SHEEN, strandPositions, strandShape, fadeFactor, pruneStrands,
} from '../logic/sheen-trail.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// layers：{ head: 頭の層, body: 体の層 }。頭を撫でたら頭の層、ほかは体の層に描く
export function createSheenTrail(layers, { random = Math.random, config = SHEEN } = {}) {
  let strands = []; // { el, born, opacity }（古い順）
  let last = null; // 前の点
  let carry = 0;
  let frame = null;

  const fadeMs = () => (reducedMotion.matches ? config.reducedFadeMs : config.fadeMs);

  function addStrand(point, direction, speed, part) {
    const shape = strandShape(point, direction, speed, random, config);
    const line = document.createElementNS(SVG_NS, 'line');
    for (const name of ['x1', 'y1', 'x2', 'y2']) line.setAttribute(name, shape[name]);
    line.setAttribute('opacity', shape.opacity);
    (part === 'head' ? layers.head : layers.body).append(line);
    strands.push({ el: line, born: performance.now(), opacity: shape.opacity });
  }

  function step(now) {
    const duration = fadeMs();
    for (const s of strands) {
      s.el.setAttribute('opacity', s.opacity * fadeFactor(now - s.born, duration));
    }
    const kept = pruneStrands(strands, now, duration, config.maxStrands);
    for (const s of strands) if (!kept.includes(s)) s.el.remove();
    strands = kept;
    frame = strands.length > 0 ? requestAnimationFrame(step) : null;
  }

  function animate() {
    if (frame === null) frame = requestAnimationFrame(step);
  }

  return {
    start({ x, y }) {
      last = { x, y };
      carry = 0;
    },
    move({ x, y, speed, part }) {
      if (!last) {
        last = { x, y };
        return;
      }
      const point = { x, y };
      const direction = { x: x - last.x, y: y - last.y };
      const placed = strandPositions(last, point, carry, config.spacing);
      for (const p of placed.points) addStrand(p, direction, speed, part);
      carry = placed.carry;
      last = point;
      if (placed.points.length > 0) animate();
    },
    end() {
      last = null;
      carry = 0;
    },
  };
}
