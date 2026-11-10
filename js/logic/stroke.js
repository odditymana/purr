// 撫でる操作の計算（距離・速さ・撫でているかの判定・部位のまとめ方）。DOM には触れない。
// 座標はすべて猫の SVG の座標（viewBox 800×400）、時刻はミリ秒

export const STROKE = {
  // 押してからこの距離を動いたら「撫でている」とみなす（押しただけ・叩いただけは含めない）
  startDistance: 8,
  // 速さを測るときに使う、直近の記録の時間の幅
  speedWindowMs: 120,
};

// 形の名前（cat-shape.svg の id）→ 撫でる部位
const STROKE_PARTS = {
  head: 'head',
  earFar: 'head',
  earNear: 'head',
  eye: 'head',
  nose: 'head',
  mouth: 'head',
  whiskers: 'head',
  body: 'body',
  hindLeg: 'body', // 体の奥に隠れているので、ふつうは当たらない
  belly: 'belly',
  tail: 'tail',
  frontLegs: 'frontLegs',
};

// 形の名前を撫でる部位にまとめる。猫の部位でなければ null
export function strokePartOf(shapeName) {
  return STROKE_PARTS[shapeName] ?? null;
}

// <use href="#shape-○○"> の href から形の名前を取り出す。当てはまらなければ null
export function shapeNameFromHref(href) {
  const match = /^#shape-(.+)$/.exec(href ?? '');
  return match ? match[1] : null;
}

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// 位置の記録（{ x, y, t }）に新しい記録を足し、時間の幅より古いものを捨てた新しい配列を返す
export function addSample(samples, sample, windowMs = STROKE.speedWindowMs) {
  return [...samples.filter((s) => sample.t - s.t <= windowMs), sample];
}

// 記録から今の速さ（座標の単位／秒）を求める。記録が足りないか、時間が進んでいなければ 0
export function strokeSpeed(samples) {
  if (samples.length < 2) return 0;
  const elapsed = samples[samples.length - 1].t - samples[0].t;
  if (elapsed <= 0) return 0;
  let travelled = 0;
  for (let i = 1; i < samples.length; i++) travelled += distance(samples[i - 1], samples[i]);
  return (travelled / elapsed) * 1000;
}

// 押してから動いた合計の距離で、撫でているかを決める
export function isStroking(travelled, config = STROKE) {
  return travelled >= config.startDistance;
}
