// ゴロゴロを鳴らす。撫でているあいだ、ゆっくり大きくなり、やめるとゆっくり小さくなって消える。
// - 音の準備（AudioContext を作る・再開する）は、ユーザーの操作の中で prepare() を呼んで行う
//   （ブラウザの決まりで、操作の前には鳴らせない。タッチでは「指を離したとき」が操作にあたる）
// - タブが見えなくなったときだけ AudioContext を休ませる。
//   無音になっても休ませない（iPhone では、再開にもユーザーの操作がいることがあり、撫で始めに鳴り遅れるため）
// - iPhone のマナーモードは尊重する（audioSession を 'ambient' にする。マナーモードでは鳴らない）
// 値と計算は js/logic/purr.js、音の組み立ては js/sound/purr-graph.js にある

import { PURR, purrLevel, levelToGain, pulseRate, resumeStrokeTime } from '../logic/purr.js';
import { buildPurrGraph } from './purr-graph.js';

// 消音にしたとき・戻したときの、音量の切り替えの速さ（時定数、秒）
const MUTE_TAU = 0.05;
// 撫でている最中に音量を合わせ直す間隔の最小（ミリ秒）。pointermove ごとでは多すぎる
const UPDATE_EVERY_MS = 100;

export function createPurrSound({ breathSeconds, muted = false, config = PURR }) {
  let ctx = null;
  let graph = null;
  let muteGain = null;
  let isMuted = muted;
  let stroking = false;
  let strokeStart = 0; // 撫で続けた時間を数え始めた時刻（performance.now）
  let lastEnd = -Infinity; // 最後に撫でるのをやめた時刻
  let lastStrokeMs = 0; // やめたときまでに撫で続けた時間
  let lastUpdate = 0;

  // マナーモードを尊重する（対応しているブラウザだけ。Safari 16.4 以降など）
  function useAmbientSession() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    } catch {
      // 対応していなければ何もしない
    }
  }

  function create() {
    useAmbientSession();
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return false;
    ctx = new AudioContextClass();
    graph = buildPurrGraph(ctx, { breathSeconds, config });
    muteGain = ctx.createGain();
    muteGain.gain.value = isMuted ? 0 : 1;
    graph.output.connect(muteGain).connect(ctx.destination);
    return true;
  }

  function update(speed = 0, force = false) {
    if (!graph || !stroking) return;
    const now = performance.now();
    if (!force && now - lastUpdate < UPDATE_EVERY_MS) return;
    lastUpdate = now;
    const level = purrLevel(now - strokeStart, speed, config);
    graph.setGain(levelToGain(level, config), config.attackTau);
    graph.setPulseRate(pulseRate(speed, config));
  }

  // タブが見えなくなったら休ませ、戻ってきたら再開する（再開できないときは、次の操作の prepare() で再開する）
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else if (!isMuted) ctx.resume();
  });

  return {
    // ユーザーの操作の中で呼ぶ。消音中は準備しない
    prepare() {
      if (isMuted) return;
      if (!ctx && !create()) return;
      if (ctx.state !== 'running') ctx.resume();
    },
    start() {
      const now = performance.now();
      strokeStart = now - resumeStrokeTime(lastStrokeMs, now - lastEnd, config);
      stroking = true;
      if (ctx && ctx.state !== 'running' && document.visibilityState === 'visible') ctx.resume();
      update(0, true);
    },
    move({ speed }) {
      update(speed);
    },
    stop() {
      if (!stroking) return;
      stroking = false;
      lastEnd = performance.now();
      lastStrokeMs = lastEnd - strokeStart;
      if (!graph) return;
      graph.setGain(0, config.releaseTau);
    },
    // 今の音の状態（確認用の表示に使う）：none（まだ準備していない）/ suspended / running / interrupted など
    state() {
      return ctx?.state ?? 'none';
    },
    // 消音の切り替え。ボタンを押した操作の中で呼ばれるので、ここで準備してもよい
    setMuted(value) {
      isMuted = value;
      if (!isMuted && !ctx) create();
      if (!ctx) return;
      muteGain.gain.setTargetAtTime(isMuted ? 0 : 1, ctx.currentTime, MUTE_TAU);
      if (!isMuted && stroking && ctx.state !== 'running') ctx.resume();
      if (!isMuted && stroking) update(0, true);
    },
  };
}
