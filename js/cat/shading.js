// 部位ごとのツヤと影の楕円を作り、その部位の形で切り抜いて重ねる。
// 位置の表と計算は js/logic/shading-geometry.js にある

import { SHADING, placeEllipse, padBox } from '../logic/shading-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// 毛のフィルターで輪郭がずれる分、切り抜きの範囲に持たせる余白
const MASK_PADDING = 10;

// 部位の形の mask を作る。形は <g> の入れ物（shape-○○）なので、clipPath ではなく mask を使う
// （clipPath の中の <use> は <g> を参照できず、切り抜きが空になってしまう）
function createPartMask(name, box, defs) {
  const area = padBox(box, MASK_PADDING);
  const mask = document.createElementNS(SVG_NS, 'mask');
  mask.id = `mask-${name}`;
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', area.x);
  mask.setAttribute('y', area.y);
  mask.setAttribute('width', area.width);
  mask.setAttribute('height', area.height);

  const shape = document.createElementNS(SVG_NS, 'use');
  shape.setAttribute('href', `#shape-${name}`);
  shape.setAttribute('fill', '#fff');
  mask.append(shape);
  defs.append(mask);
  return mask;
}

function createEllipse(box, spec) {
  const geo = placeEllipse(box, spec);
  const ellipse = document.createElementNS(SVG_NS, 'ellipse');
  ellipse.setAttribute('cx', geo.cx);
  ellipse.setAttribute('cy', geo.cy);
  ellipse.setAttribute('rx', geo.rx);
  ellipse.setAttribute('ry', geo.ry);
  ellipse.setAttribute('fill', `url(#${spec.type})`);
  ellipse.setAttribute('opacity', spec.opacity);
  if (geo.transform) ellipse.setAttribute('transform', geo.transform);
  return ellipse;
}

// 1つの部位にツヤと影を足す。部位の <g data-part> の中に、切り抜いた層を加える
function shadePart(svg, defs, name) {
  const group = svg.querySelector(`[data-part="${name}"]`);
  const use = group?.querySelector('use.fur');
  if (!use) return;

  const box = use.getBBox();
  if (box.width === 0 || box.height === 0) return;

  const mask = createPartMask(name, box, defs);
  const layer = document.createElementNS(SVG_NS, 'g');
  // 楕円は部位の形からはみ出しているので、撫でる操作の当たり判定からは外す（css/style.css）
  layer.setAttribute('class', 'shading');
  layer.setAttribute('mask', `url(#${mask.id})`);
  for (const spec of SHADING[name]) layer.append(createEllipse(box, spec));
  group.append(layer);
}

// 取り込めなかった部位（skip）を除いて、表にあるすべての部位にツヤと影を足す
export function applyShading(svg, defs, skip = []) {
  for (const name of Object.keys(SHADING)) {
    if (!skip.includes(name)) shadePart(svg, defs, name);
  }
}
