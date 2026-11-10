// 形のファイル（assets/cat-shape.svg）を読み込んで、ページの SVG に取り込む。
// - 要素を複製して <defs> に入れ、<use> で参照する
//   （path 以外の ellipse・circle・line なども、そのまま正しく描ける）
// - 色・線・class などの見た目の属性はすべて外す（見た目は css/style.css で決める）
// - Illustrator が付ける transform や <g> の入れ子も、そのまま保つ

import { PARTS, compareIds } from '../logic/cat-parts.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// 形として扱える要素
const SHAPE_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'g']);
// 中身がなくても問題のない要素（黙って取り除く）
const IGNORED_TAGS = new Set(['title', 'desc', 'metadata']);

// 外す見た目の属性
const PAINT_ATTRS = [
  'id', 'class', 'style', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'opacity', 'filter', 'clip-path', 'mask', 'display', 'visibility',
];

async function fetchShapeDocument(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} を読み込めませんでした（${response.status}）`);
  const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error(`${url} の書式が正しくありません`);
  return doc;
}

// 要素の祖先（ルートの <svg> を除く）にある transform を、外側から順に集める
function ancestorTransforms(el) {
  const list = [];
  for (let node = el.parentElement; node && node.localName !== 'svg'; node = node.parentElement) {
    const t = node.getAttribute('transform');
    if (t) list.unshift(t);
  }
  return list.join(' ');
}

// 見た目の属性を外し、形として使えない要素を取り除く。気づいた点は notes に足す
function sanitize(el, partName, notes) {
  for (const child of [...el.children]) {
    if (IGNORED_TAGS.has(child.localName)) {
      child.remove();
    } else if (!SHAPE_TAGS.has(child.localName)) {
      notes.push(`${partName}：形として使えない要素 <${child.localName}> を無視しました`);
      child.remove();
    } else {
      sanitize(child, partName, notes);
    }
  }
  for (const attr of PAINT_ATTRS) el.removeAttribute(attr);
}

// 1つの部位を <g id="shape-○○"> に包んで defs に入れる。取り込めたら true
function importPart(shapeDoc, name, defs, notes) {
  const source = shapeDoc.querySelector(`[id="${name}"]`);
  if (!source) return false;

  if (!SHAPE_TAGS.has(source.localName)) {
    notes.push(`${name}：<${source.localName}> は形として使えないため、読み込みませんでした`);
    return false;
  }
  if (source.localName !== 'path') {
    notes.push(`${name}：<${source.localName}> として書かれていたので、そのまま読み込みました`);
  }

  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.id = `shape-${name}`;
  const outer = ancestorTransforms(source);
  if (outer) wrapper.setAttribute('transform', outer);
  if (outer || source.hasAttribute('transform')) {
    notes.push(`${name}：transform が付いていたので、そのまま適用しました`);
  }

  const clone = document.importNode(source, true);
  sanitize(clone, name, notes);
  wrapper.append(clone);
  defs.append(wrapper);
  return true;
}

// 形を読み込み、svg の defs に取り込む。
// 取り込めなかった部位の一覧と、気づいた点（notes）を返す。読み込み自体の失敗は例外になる
export async function loadShapes(url, svg, defs) {
  const shapeDoc = await fetchShapeDocument(url);
  const notes = [];

  // 画面の範囲（viewBox）は形のファイルに合わせる
  const viewBox = shapeDoc.documentElement.getAttribute('viewBox');
  if (viewBox && viewBox !== svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', viewBox);
    notes.push(`viewBox が「${viewBox}」に変わっていたので、表示の範囲を合わせました`);
  }

  const ids = [...shapeDoc.querySelectorAll('[id]')].map((el) => el.id);
  const { unknown } = compareIds(ids);
  if (unknown.length > 0) {
    notes.push(`使っていない id があります：${unknown.join('、')}（名前が変わっていないか確認してください）`);
  }

  // id があっても、形として使えない要素なら取り込めない
  const missing = PARTS.filter((name) => !importPart(shapeDoc, name, defs, notes));
  return { missing, notes };
}
