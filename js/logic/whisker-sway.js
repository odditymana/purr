// ひげのかすかな動きの値と計算。DOM には触れない。
// - 耳がぴくっと動くとき、ひげもつられてかすかに寄って戻る（follow）
// - 頭を撫でているとき、撫でている位置に近いほうの束が、空気が動いた程度に揺れる（sway）
// ひげは上の束（4本、頭の上へ向かう）と下の束（5本、床へ向かう）に分けて、それぞれ根元を支点に回す。
// 座標は猫の SVG の座標（viewBox 800×400）、角度は度、時間はミリ秒

export const WHISKER_SWAY = {
  // 2つの束の境目（鼻の高さ）。これより上が上の束、下が下の束
  splitY: 258,
  // 束ごとの支点（根元のあたり）と、「前へ寄る」向き（+1 で時計回り）。
  // 前（顔の先の側、画面の右）へ寄るのは、上の束では時計回り、下の束では反時計回り
  bundles: {
    upper: { pivot: { x: 239, y: 229 }, direction: 1 },
    lower: { pivot: { x: 229, y: 291 }, direction: -1 },
  },

  // 耳につられる動き
  follow: {
    // 上の束が寄る角度。実機で見て決める（足りなければ 6〜8 まで上げる）
    angleDeg: 4,
    // 下の束は先が床に着いているので、上の束の何割にするか
    lowerRatio: 0.5,
    // 耳が動き始めてから、ひげが動き始めるまでの遅れ
    delayMs: 60,
    // ゆっくり寄る時間と、さらにゆっくり戻る時間（ぴんと跳ねないよう、耳より遅く）
    moveMs: 250,
    returnMs: 600,
  },

  // 撫でているときの揺れ
  sway: {
    // 振れ幅の範囲。撫でる速さが fastSpeed（座標の単位／秒）以上で maxDeg、止まりかけで minDeg
    minDeg: 1,
    maxDeg: 2.5,
    fastSpeed: 600,
    // 1回の揺れの長さと、そのあいだに振れる回数（往復）
    durationMs: 1200,
    cycles: 2.5,
    // だんだん小さくなる速さ（大きいほど早く収まる）
    decay: 3,
    // キーフレームの数（多いほど、なめらかな曲線に近づく）
    steps: 24,
  },
};

const rotate = (deg) => `rotate(${Math.round(deg * 1000) / 1000}deg)`;

// 耳につられる動きのキーフレーム（Web Animations API の形）。
// 0° からゆっくり寄って、さらにゆっくり 0° へ戻る。上の束と下の束で角度と向きが違う
export function followKeyframes(config = WHISKER_SWAY) {
  const { angleDeg, lowerRatio, delayMs, moveMs, returnMs } = config.follow;
  const durationMs = moveMs + returnMs;
  const peak = moveMs / durationMs;
  const frames = (deg) => [
    { transform: rotate(0), offset: 0, easing: 'ease-in-out' },
    { transform: rotate(deg), offset: peak, easing: 'ease-in-out' },
    { transform: rotate(0), offset: 1 },
  ];
  return {
    durationMs,
    delayMs,
    upper: frames(angleDeg * config.bundles.upper.direction),
    lower: frames(angleDeg * lowerRatio * config.bundles.lower.direction),
  };
}

// 撫でる速さから、揺れの振れ幅（度）を決める。速いほど大きく、minDeg〜maxDeg に収める
export function swayAmplitude(speed, config = WHISKER_SWAY) {
  const { minDeg, maxDeg, fastSpeed } = config.sway;
  const t = Math.min(Math.max(speed / fastSpeed, 0), 1);
  return minDeg + (maxDeg - minDeg) * t;
}

// 振れ幅 amplitudeDeg の、だんだん小さくなる揺れのキーフレーム。
// 角度 = 振れ幅 × e^(−decay × t) × sin(2π × cycles × t)（t は 0〜1）。0° で始まり、0° で終わる
export function swayKeyframes(amplitudeDeg, config = WHISKER_SWAY) {
  const { durationMs, cycles, decay, steps } = config.sway;
  const keyframes = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const deg = i === steps ? 0 : amplitudeDeg * Math.exp(-decay * t) * Math.sin(2 * Math.PI * cycles * t);
    keyframes.push({ transform: rotate(deg), offset: t });
  }
  return { durationMs, keyframes };
}

// 撫でている位置（SVG の y）から、揺らす束を決める
export function bundleAt(y, config = WHISKER_SWAY) {
  return y < config.splitY ? 'upper' : 'lower';
}
