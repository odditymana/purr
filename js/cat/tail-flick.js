// 撫でているあいだ、しっぽの先がときどきぱたっと持ち上がって戻る。撫でていないときは動かない。
// 持ち上がる一瞬だけ、先の上の縁のツヤを明るくして、動きを分かりやすくする。
// 値とツヤの計算は js/logic/tail-flick.js、待ち時間・回数・回転のキーフレームの計算は js/logic/twitch.js にある。
// - prefers-reduced-motion のときは動かさない
// - 撫で終わったら次の予約をやめる（動いている最中の1回は、最後まで戻りきる）

import { TAIL_FLICK, flashKeyframes } from '../logic/tail-flick.js';
import { planTwitch, twitchKeyframes } from '../logic/twitch.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// tip：回す、しっぽの先のグループ / flash：先の上の縁を明るくするツヤ（なくてもよい）。
// start() / stop() を撫で始めと撫で終わりで呼ぶ
export function createTailFlick(tip, flash, { random = Math.random, config = TAIL_FLICK } = {}) {
  const { keyframes, durationMs } = twitchKeyframes(config);
  const flashFrames = flashKeyframes(config);
  let timer = null; // 次の動きの予約
  let stroking = false;
  let flicking = false; // 動いている最中

  // count 回続けて動かす。終わりはアニメーションの finished ではなく、長さぶんの時間で待つ
  // （描画が止まっている環境でも、予約が途切れないようにするため）
  async function flick(count) {
    flicking = true;
    for (let i = 0; i < count; i++) {
      if (i > 0) await wait(config.doubleGapMs);
      if (!stroking || reducedMotion.matches) break;
      tip.animate(keyframes, { duration: durationMs });
      flash?.animate(flashFrames, { duration: durationMs });
      await wait(durationMs);
    }
    flicking = false;
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!stroking || flicking || reducedMotion.matches) return;
    const { delayMs, count } = planTwitch(random, config);
    timer = setTimeout(() => {
      timer = null;
      flick(count);
    }, delayMs);
  }

  return {
    start() {
      stroking = true;
      schedule();
    },
    stop() {
      stroking = false;
      clearTimeout(timer);
      timer = null;
    },
  };
}
