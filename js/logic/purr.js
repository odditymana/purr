// ゴロゴロの音の値と計算。DOM にも Web Audio にも触れない。
// 音の組み立ては js/sound/purr-graph.js、鳴らし方は js/sound/purr-sound.js にある

export const PURR = {
  // いちばん大きいときの音量（Web Audio の gain）。
  // 小さなスピーカーでも聞こえる大きさで、音割れしない余裕を残す（いちばん大きい振幅で 0.3 ほど）
  maxGain: 0.8,
  // 撫で始めたときの大きさ（0〜1）。ここから撫で続けると、だんだん大きくなる
  startLevel: 0.45,
  // この時間撫で続けると、いちばん大きく・深くなる（ミリ秒）
  fullAfterMs: 8000,
  // 速く撫でたときに足す大きさと、その「速い」の目安（座標の単位／秒）
  speedBoost: 0.1,
  fastSpeed: 600,
  // 撫でるのをやめても、この時間のうちに撫で直せば続きから（ミリ秒）
  resumeWithinMs: 1500,

  // 大きくなる速さと、消える速さ（Web Audio の setTargetAtTime の時定数、秒）。
  // 時定数の約3倍で、ほぼ目標に届く（大きくなるのに約2.5秒、消えるのに約3秒）
  attackTau: 0.8,
  releaseTau: 1.0,
  // 消えきったとみなして音の処理を休ませるまでの時間（ミリ秒）
  sleepAfterMs: 4000,

  // ぶるぶるの刻み（1秒あたりの回数）。速く撫でると少し速くなる
  slowPulseHz: 24,
  fastPulseHz: 27,
  // 刻みの深さ（0〜1）。大きいほど、ぶるぶるがはっきりする
  pulseDepth: 0.75,

  // 胸に響く成分：基音と倍音（Hz と強さ）。
  // スマホやノートパソコンの小さなスピーカーは 50 Hz をほとんど鳴らせないので、
  // 100〜300 Hz の倍音をしっかり入れて、小さなスピーカーでもゴロゴロと聞こえるようにする
  baseHz: 50,
  harmonics: [0.5, 0.9, 0.75, 0.55, 0.4, 0.25], // 50, 100, 150, 200, 250, 300 Hz
  // ざらっとした息の成分（ノイズ）を通す帯域と、混ぜる割合
  noiseBandHz: 180,
  noiseQ: 0.7,
  toneMix: 0.55,
  noiseMix: 0.6,
  // こもらせるローパスの周波数
  lowpassHz: 650,
  // 息の調子：吸うときは小さく、吐くときは大きく。その深さ（0〜1）
  breathDepth: 0.25,
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// 撫で続けた時間（ミリ秒）と今の速さから、目標の大きさ（0〜1）を求める。
// はじめは早く、だんだんゆるやかに大きくなる
export function purrLevel(strokingMs, speed, config = PURR) {
  const t = clamp01(strokingMs / config.fullAfterMs);
  const grown = 1 - (1 - t) * (1 - t);
  const base = config.startLevel + (1 - config.startLevel) * grown;
  const boost = config.speedBoost * clamp01(speed / config.fastSpeed);
  return clamp01(base + boost);
}

// 大きさ（0〜1）を実際の音量に直す。耳には音量の2乗くらいが自然に増えて聞こえる
export function levelToGain(level, config = PURR) {
  return config.maxGain * clamp01(level) ** 2;
}

// 今の速さに合わせた、ぶるぶるの刻みの速さ（1秒あたりの回数）
export function pulseRate(speed, config = PURR) {
  return config.slowPulseHz + (config.fastPulseHz - config.slowPulseHz) * clamp01(speed / config.fastSpeed);
}

// 撫でるのをやめてから gapMs 後に撫で直したとき、撫で続けた時間をどこから数えるか
export function resumeStrokeTime(previousMs, gapMs, config = PURR) {
  return gapMs <= config.resumeWithinMs ? previousMs : 0;
}

// CSS の時間（"4.5s" や "4500ms"）を秒に直す。読めなければ fallback
export function parseCssSeconds(text, fallback) {
  const match = /^\s*(-?[\d.]+)\s*(ms|s)\s*$/.exec(text ?? '');
  if (!match) return fallback;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return match[2] === 'ms' ? value / 1000 : value;
}

// ざらっとした息の成分の元になる、低めのノイズ（ブラウンノイズ）の数列を作る。
// random は 0 以上 1 未満を返す関数。いちばん大きい値が 1 になるようにそろえる
export function brownNoise(length, random) {
  const data = new Float32Array(length);
  let last = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // 少しずつ元へ戻しながら積み重ねる（低い音が多くなる）
    data[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  return data;
}

// 胸に響く成分の波形（PeriodicWave に渡す実部・虚部）。倍音の強さから作る
export function toneWaveCoefficients(config = PURR) {
  const n = config.harmonics.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  config.harmonics.forEach((amp, i) => {
    imag[i + 1] = amp;
  });
  return { real, imag };
}
