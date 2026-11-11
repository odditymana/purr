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

  // ぶるぶるの刻み（1秒あたりの「ブッ」の数）。速く撫でると少し速くなる（最大 +8% ほど）
  slowPulseHz: 25,
  fastPulseHz: 27,

  // 1回ずつの「ブッ」（粒）：少し鋭く立ち上がり、速く減衰する（ミリ秒）
  grainAttackMs: 3,
  grainDecayMs: 16, // 減衰の時定数
  // 粒の間隔と強さの、毎回のばらつき（割合）
  intervalJitter: 0.1,
  amplitudeJitter: 0.2,

  // 吸うときと吐くとき：呼吸のアニメーションと同じく、吸う 4 割・吐く 6 割
  inhaleRatio: 0.4,
  // 吸う・吐くの切り替わりの、粒の鳴らないすき間と、その前後のフェード（ミリ秒）
  gapMs: 120,
  edgeFadeMs: 30,
  // 吸うときは小さく、吐くときは大きく
  inhaleLevel: 0.7,
  exhaleLevel: 1,
  // 吸うときはこもらせ、吐くときは少し明るく（ローパスの周波数）
  inhaleLowpassHz: 480,
  exhaleLowpassHz: 1100,

  // 粒の並びを何呼吸ぶんまとめて作るか。呼吸ごとに強さも少し変え、
  // 長い並びをループして、同じばらつきの繰り返しが耳に気づかれないようにする
  breathsPerLoop: 4,
  breathLevelJitter: 0.1,

  // 主役のざらざらしたノイズ：胸に響く帯域（小さなスピーカーでも聞こえる 100〜250 Hz）と、
  // 喉の「ざらっ」とした帯域を、それぞれ帯域フィルターで通して混ぜる
  bodyBandHz: 160,
  bodyQ: 0.6,
  bodyMix: 1,
  raspBandHz: 600,
  raspQ: 0.8,
  raspMix: 0.25,
  // ノイズのループの長さ（秒）。粒の並びのループと割り切れない長さにして、繰り返しを目立たせない
  noiseSeconds: 3.7,

  // 音程の成分（50 Hz と倍音）は、ごく小さく残して粒の芯の手応えにするだけ
  baseHz: 50,
  harmonics: [0.5, 0.9, 0.75, 0.55, 0.4, 0.25], // 50, 100, 150, 200, 250, 300 Hz
  toneMix: 0.05, // 1版目（0.55）の 1/10 ほど
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

// 刻みの速さを、粒の並びの再生速度に直す（並びは slowPulseHz で作ってある）
export function pulsePlaybackRate(hz, config = PURR) {
  return hz / config.slowPulseHz;
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

// 主役のざらざらしたノイズ（ピンクノイズ：高い音ほど少しずつ弱い）の数列を作る。
// random は 0 以上 1 未満を返す関数。いちばん大きい値が 1 になるようにそろえる
export function pinkNoise(length, random) {
  const data = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = b0 + b1 + b2 + white * 0.1848;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  return data;
}

// 1つの粒の、始まりからの時間（秒）に対する音量（0〜1）。
// 立ち上がりは直線で、そのあと指数的に減衰する
export function grainShape(t, config = PURR) {
  const attack = config.grainAttackMs / 1000;
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / (config.grainDecayMs / 1000));
}

// 粒の並びを決める。breathSeconds の呼吸を breathsPerLoop 回ぶん。
// それぞれの呼吸を「吸う」「吐く」に分け、切り替わりにすき間を空けて、その中に粒を並べる。
// 返す粒は { time（秒）, amplitude, phase: 'inhale' | 'exhale' }。random は 0 以上 1 未満を返す関数
export function planGrains(breathSeconds, random, config = PURR) {
  const grains = [];
  const gap = config.gapMs / 1000;
  const fade = config.edgeFadeMs / 1000;
  const interval = 1 / config.slowPulseHz;
  const jitter = (amount) => 1 + (random() * 2 - 1) * amount;

  for (let b = 0; b < config.breathsPerLoop; b++) {
    const start = b * breathSeconds;
    const breathLevel = jitter(config.breathLevelJitter);
    const switchAt = start + breathSeconds * config.inhaleRatio;
    const windows = [
      { phase: 'inhale', from: start + gap / 2, to: switchAt - gap / 2, level: config.inhaleLevel },
      { phase: 'exhale', from: switchAt + gap / 2, to: start + breathSeconds - gap / 2, level: config.exhaleLevel },
    ];
    for (const w of windows) {
      for (let t = w.from; t < w.to; t += interval * jitter(config.intervalJitter)) {
        // すき間の前後は、粒をだんだん弱くしてつなぐ（ぷつっという雑音を出さない）
        const edge = Math.min(1, (t - w.from) / fade, (w.to - t) / fade);
        const amplitude = breathLevel * w.level * jitter(config.amplitudeJitter) * Math.max(0, edge);
        grains.push({ time: t, amplitude, phase: w.phase });
      }
    }
  }
  return grains;
}

// 粒の並びから、吸う側と吐く側の音量の包絡（ループの長さぶんの数列）を作る。
// 粒の尾がループの終わりを越えたら、頭へ回り込ませて、つなぎ目を目立たせない
export function grainEnvelopes(grains, loopSeconds, sampleRate, config = PURR) {
  const length = Math.round(loopSeconds * sampleRate);
  const inhale = new Float32Array(length);
  const exhale = new Float32Array(length);
  const tail = Math.ceil(((config.grainAttackMs + config.grainDecayMs * 6) / 1000) * sampleRate);
  for (const g of grains) {
    const target = g.phase === 'inhale' ? inhale : exhale;
    const first = Math.round(g.time * sampleRate);
    for (let i = 0; i < tail; i++) {
      target[(first + i) % length] += g.amplitude * grainShape(i / sampleRate, config);
    }
  }
  return { inhale, exhale };
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
