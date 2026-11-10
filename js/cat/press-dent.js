// 撫でた場所の近くの体が、わずかに沈む（押されてへこむ）反応。
// 猫全体の入れ物に沈み込みのフィルター（#press）をかけ、撫でている点のまわりの絵を少し下へずらす。
// - 撫で始めると素早く沈み、離すとゆっくり戻る（動きを減らす設定では短く戻る）
// - 沈んでいないあいだはフィルターを外しておく（描く負担を減らす）
// 値と計算は js/logic/press.js にある

import { PRESS, approach, approachDuration, dentArea } from '../logic/press.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// target：フィルターをかける要素 / mapImage：地図の <feImage> / displacement：<feDisplacementMap>
export function createPressDent({ target, filterUrl, mapImage, displacement }, config = PRESS) {
  let depth = 0;
  let goal = 0;
  let frame = null;
  let lastTime = 0;

  function moveTo(point) {
    const area = dentArea(point, config.radius);
    for (const [name, value] of Object.entries(area)) mapImage.setAttribute(name, value);
  }

  function step(time) {
    const elapsed = lastTime ? time - lastTime : 0;
    lastTime = time;
    const duration = approachDuration(depth, goal, { reducedMotion: reducedMotion.matches }, config);
    depth = approach(depth, goal, elapsed, duration);
    displacement.setAttribute('scale', depth);

    if (depth === goal) {
      frame = null;
      lastTime = 0;
      if (depth === 0) target.removeAttribute('filter');
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function animate() {
    if (frame === null) frame = requestAnimationFrame(step);
  }

  return {
    press(point) {
      moveTo(point);
      target.setAttribute('filter', filterUrl);
      goal = config.depth;
      animate();
    },
    move(point) {
      moveTo(point);
    },
    release() {
      goal = 0;
      animate();
    },
  };
}
