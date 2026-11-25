// ひげを、かすかに動かす。
// - follow()：耳がぴくっと動くとき、ひげもつられて少し寄って戻る（耳の動きから呼ぶ）
// - sway(stroke)：頭を撫でているとき、撫でている位置に近いほうの束が、空気が動いた程度に揺れる
// ひげは上の束・下の束に分けてあり（index.html の #whiskers-upper・#whiskers-lower）、
// 外側のグループで耳につられる動き、内側のグループで撫でたときの揺れを動かす。
// 値と計算は js/logic/whisker-sway.js にある。
// - prefers-reduced-motion のときと、タブが見えていないときは動かさない（設定が途中で変わったら止める）
// - ひげには毛のフィルター（ノイズ）がかかっていないので、回してもチラつかない

import { WHISKER_SWAY, followKeyframes, swayAmplitude, swayKeyframes, bundleAt } from '../logic/whisker-sway.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createWhiskerSway({ upper, lower }, { config = WHISKER_SWAY } = {}) {
  const follow = followKeyframes(config);

  // 束ごとに、回す2つのグループ（外：耳につられる、内：揺れ）と、動いている最中のアニメーション
  const bundles = {};
  for (const [name, outer] of Object.entries({ upper, lower })) {
    const inner = outer.firstElementChild;
    const { x, y } = config.bundles[name].pivot;
    for (const g of [outer, inner]) {
      g.style.transformBox = 'view-box';
      g.style.transformOrigin = `${x}px ${y}px`;
    }
    bundles[name] = { outer, inner, following: null, swaying: null };
  }

  const canMove = () => !reducedMotion.matches && document.visibilityState === 'visible';

  function stopAll() {
    for (const b of Object.values(bundles)) {
      b.following?.cancel();
      b.swaying?.cancel();
      b.following = null;
      b.swaying = null;
    }
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stopAll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') stopAll();
  });

  return {
    // 耳がぴくっと動いたときに呼ぶ。少し遅れて、両方の束がゆっくり寄って戻る
    follow() {
      if (!canMove()) return;
      for (const name of ['upper', 'lower']) {
        const b = bundles[name];
        b.following?.cancel();
        b.following = b.outer.animate(follow[name], { duration: follow.durationMs, delay: follow.delayMs });
      }
    },

    // 頭を撫でているあいだに呼ぶ（{ y, speed } は撫でている位置と速さ）。
    // 揺れている最中なら重ねずに、そのまま揺れ終わるのを待つ
    sway({ y, speed }) {
      if (!canMove()) return;
      const name = bundleAt(y, config);
      const b = bundles[name];
      if (b.swaying?.playState === 'running') return;
      const amplitude = swayAmplitude(speed, config) * config.bundles[name].direction;
      const { durationMs, keyframes } = swayKeyframes(amplitude, config);
      b.swaying = b.inner.animate(keyframes, { duration: durationMs });
    },
  };
}
