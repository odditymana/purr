// 画面の処理の入口。猫の形を読み込み、ツヤと影、ひげの濃淡を整え、耳の動きと撫でる操作を始める。
// 計算だけの処理は js/logic/ に分けてある。
// 読み込みで問題があっても画面には出さず、console に知らせる

import { loadShapes } from './cat/shape-loader.js';
import { applyShading } from './cat/shading.js';
import { fitWhiskerFade } from './cat/whiskers.js';
import { startEarTwitch } from './cat/ear-twitch.js';
import { watchStrokes } from './cat/stroke-input.js';
import { createPressDent } from './cat/press-dent.js';
import { createSheenTrail } from './cat/sheen-trail.js';
import { createTailFlick } from './cat/tail-flick.js';
import { createPurrSound } from './sound/purr-sound.js';
import { setupSoundToggle, loadMuted } from './ui/sound-toggle.js';
import { setupDebugPanel } from './ui/debug-panel.js';
import { parseCssSeconds } from './logic/purr.js';

// 形のファイル（ページからの相対位置）
const SHAPE_URL = 'assets/cat-shape.svg';

async function init() {
  const svg = document.getElementById('cat');
  const defs = document.getElementById('shapes');

  let result;
  try {
    result = await loadShapes(SHAPE_URL, svg, defs);
  } catch (error) {
    console.error(`PURR：猫の形を読み込めませんでした。${error.message}`);
    return;
  }

  const { missing, notes } = result;
  for (const note of notes) console.warn(`PURR：${note}`);
  if (missing.length > 0) {
    console.error(`PURR：見つからない部位があります：${missing.join('、')}`);
  }

  applyShading(svg, defs, missing);
  // 濃淡の中心は鼻なので、鼻とひげの両方がそろっているときだけ合わせる
  if (!missing.includes('whiskers') && !missing.includes('nose')) {
    fitWhiskerFade(
      document.getElementById('nose-use'),
      document.getElementById('whiskers-use'),
      document.getElementById('whisker-fade'),
    );
  }

  if (!missing.includes('earFar')) startEarTwitch(document.getElementById('ear-twitch'));

  // 撫でる：撫でている間、撫でた場所の近くが沈み、離すと戻る。撫でた跡にはツヤの筋が走り、ゆっくり消える。
  // 撫でているあいだは、しっぽの先がときどきぱたっと持ち上がる
  const dent = createPressDent({
    target: document.getElementById('cat-press'),
    filterUrl: 'url(#press)',
    mapImage: document.getElementById('press-map'),
    displacement: document.getElementById('press-displacement'),
  });
  const sheen = createSheenTrail({
    head: document.getElementById('sheen-head'),
    body: document.getElementById('sheen-body'),
  });
  const tail = createTailFlick(document.getElementById('tail-tip'), document.getElementById('tail-flash'));

  // ゴロゴロ：息の調子は呼吸のアニメーションと同じ周期にする。消音の状態は覚えておいたものを使う
  const breathSeconds = parseCssSeconds(
    getComputedStyle(document.documentElement).getPropertyValue('--breath-duration'),
    4.5,
  );
  const muted = loadMuted();
  const purr = createPurrSound({ breathSeconds, muted });
  setupSoundToggle(document.getElementById('sound-toggle'), {
    muted,
    onChange: (value) => purr.setMuted(value),
  });
  // ページのどこかをタップ・クリックしたときにも音の準備をしておく。
  // 撫でる前に一度どこかに触れていれば、最初のひと撫でから鳴る
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) {
    document.addEventListener(type, () => purr.prepare(), { passive: true });
  }
  // URL に ?debug=1 を付けたときだけ、音の状態を画面の隅に出す（実機での確認用）
  setupDebugPanel({ audioState: () => purr.state() });

  watchStrokes(svg, {
    // 最初のひと撫で（押した操作）で、音の準備を始める
    onPress: () => purr.prepare(),
    onStart: (stroke) => {
      dent.press(stroke);
      sheen.start(stroke);
      tail.start();
      purr.start();
    },
    onMove: (stroke) => {
      dent.move(stroke);
      sheen.move(stroke);
      purr.move(stroke);
    },
    onEnd: () => {
      dent.release();
      sheen.end();
      tail.stop();
      purr.stop();
    },
  });
}

// type="module" のスクリプトは遅延実行されるため、DOM の準備を待たずに呼べる
init();
