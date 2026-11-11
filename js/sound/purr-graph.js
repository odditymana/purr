// ゴロゴロの音を Web Audio で組み立てる（音声ファイルは使わない）。
// 本番の AudioContext でも、確認用の OfflineAudioContext でも同じものを使う。
//
//   [胸に響く成分：50 Hz と 100〜300 Hz の倍音] ─┐
//                                                  ├→ ぶるぶる（1秒に 24〜27 回の刻み）→ ローパス → 息の調子 → 音量 → 出力
//   [息の成分：低めのノイズを帯域で通す] ─────────┘
//
// 値と計算は js/logic/purr.js にある

import { PURR, brownNoise, toneWaveCoefficients } from '../logic/purr.js';

// breathSeconds：息の調子の周期（呼吸のアニメーションに合わせる）
export function buildPurrGraph(ctx, { breathSeconds, random = Math.random, config = PURR }) {
  const now = ctx.currentTime;

  // 胸に響く成分：基音と倍音をまとめた波形
  const { real, imag } = toneWaveCoefficients(config);
  const tone = ctx.createOscillator();
  tone.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  tone.frequency.value = config.baseHz;
  const toneGain = ctx.createGain();
  toneGain.gain.value = config.toneMix / config.harmonics.reduce((a, b) => a + b, 0);

  // 息の成分：2秒ぶんの低めのノイズをくり返し鳴らし、帯域で通す
  const noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * 2), ctx.sampleRate);
  noiseBuffer.copyToChannel(brownNoise(noiseBuffer.length, random), 0);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = config.noiseBandHz;
  band.Q.value = config.noiseQ;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = config.noiseMix;

  // ぶるぶる：音量を 1 秒に 24〜27 回、上げ下げする。
  // 音量 = (1 - 深さ/2) + (深さ/2) × 刻みの波
  const pulse = ctx.createGain();
  pulse.gain.value = 1 - config.pulseDepth / 2;
  const pulseLfo = ctx.createOscillator();
  pulseLfo.frequency.value = config.slowPulseHz;
  const pulseDepth = ctx.createGain();
  pulseDepth.gain.value = config.pulseDepth / 2;
  pulseLfo.connect(pulseDepth).connect(pulse.gain);

  // こもった響き
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = config.lowpassHz;
  lowpass.Q.value = 0.5;

  // 息の調子：呼吸と同じ周期で、ゆっくり大きく・小さく
  const breath = ctx.createGain();
  breath.gain.value = 1 - config.breathDepth / 2;
  const breathLfo = ctx.createOscillator();
  breathLfo.frequency.value = 1 / breathSeconds;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = config.breathDepth / 2;
  breathLfo.connect(breathDepth).connect(breath.gain);

  // 音量（撫で方に合わせて JS が動かす）
  const level = ctx.createGain();
  level.gain.value = 0;

  tone.connect(toneGain).connect(pulse);
  noise.connect(band).connect(noiseGain).connect(pulse);
  pulse.connect(lowpass).connect(breath).connect(level);

  for (const source of [tone, noise, pulseLfo, breathLfo]) source.start(now);

  return {
    output: level,
    // 目標の音量へ、時定数 tau（秒）でなめらかに近づける
    setGain(gain, tau, at = ctx.currentTime) {
      level.gain.cancelScheduledValues(at);
      level.gain.setTargetAtTime(gain, at, tau);
    },
    // ぶるぶるの刻みの速さを、なめらかに変える
    setPulseRate(hz, at = ctx.currentTime) {
      pulseLfo.frequency.setTargetAtTime(hz, at, 0.3);
    },
  };
}
