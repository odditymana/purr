// 上の耳（earFar）を、ときどきぴくっと動かす。
// 値は js/logic/ear-twitch.js、待ち時間・回数・キーフレームの計算は js/logic/twitch.js にある。
// - prefers-reduced-motion のときは動かさない（設定が途中で変わっても追従する）
// - タブが見えていないあいだは予約を止める

import { EAR_TWITCH } from '../logic/ear-twitch.js';
import { planTwitch, twitchKeyframes } from '../logic/twitch.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function startEarTwitch(ear, { random = Math.random, config = EAR_TWITCH } = {}) {
  const { keyframes, durationMs } = twitchKeyframes(config);
  let timer = null; // 次の動きの予約
  let running = null; // 動いている最中のアニメーション
  let generation = 0; // 止めるたびに増やし、止める前に始まった動きを打ち切る

  const canMove = () => !reducedMotion.matches && document.visibilityState === 'visible';

  // count 回続けて動かし、終わったら次を予約する。
  // 終わりはアニメーションの finished ではなく、長さぶんの時間で待つ
  // （描画が止まっている環境でも、予約が途切れないようにするため）
  async function twitch(count) {
    const myGeneration = generation;
    for (let i = 0; i < count; i++) {
      if (i > 0) await wait(config.doubleGapMs);
      if (myGeneration !== generation || !canMove()) return;
      running = ear.animate(keyframes, { duration: durationMs });
      await wait(durationMs);
      running = null;
    }
    if (myGeneration === generation) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!canMove()) return;
    const { delayMs, count } = planTwitch(random, config);
    timer = setTimeout(() => {
      timer = null;
      twitch(count);
    }, delayMs);
  }

  function stop() {
    generation++;
    clearTimeout(timer);
    timer = null;
    running?.cancel();
    running = null;
  }

  // 設定やタブの状態が変わったら、止めるか予約し直す
  function update() {
    if (canMove()) {
      if (!timer && !running) schedule();
    } else {
      stop();
    }
  }

  reducedMotion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  schedule();
}
