// ゴロゴロの音を Web Audio で組み立てる（音声ファイルは使わない）。
// 本番の AudioContext でも、確認用の OfflineAudioContext でも同じものを使う。
//
//   [ざらざらしたノイズ] ─┬→ 胸の帯域（100〜250 Hz） ─┐
//                         └→ 喉の帯域（600 Hz あたり）─┼→ 混ぜる ─┬→ 吐く：粒の並び × 明るめ ─┐
//   [ごく小さな音程の芯：50 Hz と倍音] ───────────────┘          └→ 吸う：粒の並び × こもる ─┴→ 音量 → 出力
//
// 「ブッ」という粒の並び（音量の包絡）は、何呼吸ぶんかまとめて計算した数列をループして鳴らし、
// 吸う側と吐く側で別々に、音の通り道の音量を動かす。
// 値と計算は js/logic/purr.js にある

import {
  PURR, pinkNoise, planGrains, grainEnvelopes, toneWaveCoefficients, pulsePlaybackRate,
} from '../logic/purr.js';

// breathSeconds：呼吸1回の長さ（呼吸のアニメーションに合わせる）
export function buildPurrGraph(ctx, { breathSeconds, random = Math.random, config = PURR }) {
  const now = ctx.currentTime;
  const rate = ctx.sampleRate;

  // 主役のざらざらしたノイズ：ループして鳴らす
  const noiseBuffer = ctx.createBuffer(1, Math.round(rate * config.noiseSeconds), rate);
  noiseBuffer.copyToChannel(pinkNoise(noiseBuffer.length, random), 0);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const mix = ctx.createGain();
  const band = (hz, q, gain) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hz;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    noise.connect(filter).connect(g).connect(mix);
  };
  band(config.bodyBandHz, config.bodyQ, config.bodyMix); // 胸に響く帯域
  band(config.raspBandHz, config.raspQ, config.raspMix); // 喉のざらっとした帯域

  // ごく小さな音程の芯
  const { real, imag } = toneWaveCoefficients(config);
  const tone = ctx.createOscillator();
  tone.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  tone.frequency.value = config.baseHz;
  const toneGain = ctx.createGain();
  toneGain.gain.value = config.toneMix / config.harmonics.reduce((a, b) => a + b, 0);
  tone.connect(toneGain).connect(mix);

  // 粒の並び（何呼吸ぶん）を計算して、吸う側・吐く側の包絡にする
  const loopSeconds = breathSeconds * config.breathsPerLoop;
  const { inhale, exhale } = grainEnvelopes(planGrains(breathSeconds, random, config), loopSeconds, rate, config);

  const level = ctx.createGain();
  level.gain.value = 0;

  // 吸う側と吐く側の通り道：粒の並びで音量を動かし、それぞれのこもり方で通す
  const envelopes = [];
  for (const [data, lowpassHz] of [[exhale, config.exhaleLowpassHz], [inhale, config.inhaleLowpassHz]]) {
    const path = ctx.createGain();
    path.gain.value = 0; // 音量は包絡だけで決まる
    const buffer = ctx.createBuffer(1, data.length, rate);
    buffer.copyToChannel(data, 0);
    const envelope = ctx.createBufferSource();
    envelope.buffer = buffer;
    envelope.loop = true;
    envelope.connect(path.gain);
    envelopes.push(envelope);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = lowpassHz;
    lowpass.Q.value = 0.5;
    mix.connect(path).connect(lowpass).connect(level);
  }

  for (const source of [noise, tone, ...envelopes]) source.start(now);

  return {
    output: level,
    // 目標の音量へ、時定数 tau（秒）でなめらかに近づける
    setGain(gain, tau, at = ctx.currentTime) {
      level.gain.cancelScheduledValues(at);
      level.gain.setTargetAtTime(gain, at, tau);
    },
    // ぶるぶるの刻みの速さを、粒の並びの再生速度でなめらかに変える
    setPulseRate(hz, at = ctx.currentTime) {
      for (const envelope of envelopes) {
        envelope.playbackRate.setTargetAtTime(pulsePlaybackRate(hz, config), at, 0.3);
      }
    },
  };
}
