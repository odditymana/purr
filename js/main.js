// 画面の処理の入口。猫の形を読み込み、ツヤと影、ひげの濃淡を整え、耳の動きと撫でる操作を始める。
// 計算だけの処理は js/logic/ に分けてある。
// 読み込みで問題があっても画面には出さず、console に知らせる

import { loadShapes } from './cat/shape-loader.js';
import { applyShading } from './cat/shading.js';
import { fitWhiskerFade } from './cat/whiskers.js';
import { startEarTwitch } from './cat/ear-twitch.js';
import { watchStrokes } from './cat/stroke-input.js';
import { createPressDent } from './cat/press-dent.js';

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

  // 撫でる：撫でている間、撫でた場所の近くが沈み、離すと戻る
  const dent = createPressDent({
    target: document.getElementById('cat-press'),
    filterUrl: 'url(#press)',
    mapImage: document.getElementById('press-map'),
    displacement: document.getElementById('press-displacement'),
  });
  watchStrokes(svg, {
    onStart: (stroke) => dent.press(stroke),
    onMove: (stroke) => dent.move(stroke),
    onEnd: () => dent.release(),
  });
}

// type="module" のスクリプトは遅延実行されるため、DOM の準備を待たずに呼べる
init();
