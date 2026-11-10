// ツヤと影の楕円の表と、その位置の計算。DOM には触れない。

// ツヤ（sheen）と影（shade）。位置と大きさは、その部位の外接矩形に対する割合
//   cx, cy：中心 / rx, ry：半径 / rotate：回転（度） / opacity：強さ
// 光は上から
export const SHADING = {
  tail: [
    // 筒の丸み：腰に沿って下りる部分と、床に沿って前へ回る部分の上の面
    { type: 'sheen', cx: 0.86, cy: 0.42, rx: 0.05, ry: 0.3, rotate: 20, opacity: 0.14 },
    { type: 'sheen', cx: 0.45, cy: 0.86, rx: 0.4, ry: 0.035, rotate: 0, opacity: 0.16 },
    // 先の丸み
    { type: 'sheen', cx: 0.04, cy: 0.88, rx: 0.04, ry: 0.06, rotate: 0, opacity: 0.14 },
    // 床側の縁は暗く
    { type: 'shade', cx: 0.45, cy: 1.0, rx: 0.45, ry: 0.06, rotate: 0, opacity: 0.4 },
  ],
  hindLeg: [
    // のぞく足先の上の丸み
    { type: 'sheen', cx: 0.6, cy: 0.25, rx: 0.3, ry: 0.15, rotate: 0, opacity: 0.12 },
    // 床側は暗く
    { type: 'shade', cx: 0.5, cy: 1.0, rx: 0.5, ry: 0.3, rotate: 0, opacity: 0.4 },
  ],
  body: [
    // 肩の盛り上がり（頭のすぐうしろの山）
    { type: 'sheen', cx: 0.38, cy: 0.1, rx: 0.15, ry: 0.1, rotate: -12, opacity: 0.16 },
    // 腰の盛り上がり
    { type: 'sheen', cx: 0.86, cy: 0.22, rx: 0.1, ry: 0.16, rotate: 30, opacity: 0.16 },
    // 丸い腰の後ろ側は丸みに沿って暗く
    { type: 'shade', cx: 1.0, cy: 0.6, rx: 0.06, ry: 0.4, rotate: -15, opacity: 0.3 },
    // 肩と腰のあいだ（あばら）は少し暗く
    { type: 'shade', cx: 0.68, cy: 0.35, rx: 0.07, ry: 0.3, rotate: 10, opacity: 0.2 },
    // 床に接する側
    { type: 'shade', cx: 0.5, cy: 1.0, rx: 0.5, ry: 0.15, rotate: 0, opacity: 0.4 },
  ],
  belly: [
    // お腹らしさは、ごく薄いツヤだけ
    { type: 'sheen', cx: 0.55, cy: 0.35, rx: 0.4, ry: 0.35, rotate: 5, opacity: 0.05 },
  ],
  earFar: [
    { type: 'sheen', cx: 0.5, cy: 0.4, rx: 0.3, ry: 0.1, rotate: 35, opacity: 0.1 },
  ],
  earNear: [
    { type: 'sheen', cx: 0.5, cy: 0.35, rx: 0.3, ry: 0.1, rotate: -20, opacity: 0.08 },
  ],
  head: [
    // 頭頂から額（上を向いた面）
    { type: 'sheen', cx: 0.4, cy: 0.12, rx: 0.3, ry: 0.1, rotate: 20, opacity: 0.16 },
    // マズルと頬のふくらみ
    { type: 'sheen', cx: 0.8, cy: 0.5, rx: 0.12, ry: 0.16, rotate: 0, opacity: 0.12 },
    // 床についた頬は暗く
    { type: 'shade', cx: 0.45, cy: 1.0, rx: 0.45, ry: 0.2, rotate: 0, opacity: 0.4 },
  ],
  frontLegs: [
    // 奥の手首の上の丸み
    { type: 'sheen', cx: 0.5, cy: 0.12, rx: 0.3, ry: 0.07, rotate: 25, opacity: 0.16 },
    // 付け根（左の端）は胸の陰に沈める
    { type: 'shade', cx: 0.0, cy: 0.5, rx: 0.12, ry: 0.5, rotate: 0, opacity: 0.5 },
    // 手前の手首の上の丸み
    { type: 'sheen', cx: 0.7, cy: 0.66, rx: 0.25, ry: 0.05, rotate: 8, opacity: 0.14 },
    // 2本が重なる境目は暗く
    { type: 'shade', cx: 0.5, cy: 0.6, rx: 0.3, ry: 0.06, rotate: 15, opacity: 0.35 },
  ],
};

// 外接矩形（x, y, width, height）と割合の指定から、楕円の実際の座標を求める。
// 回転は楕円の中心を軸にする（rotate が 0 なら transform は null）
export function placeEllipse(box, spec) {
  const cx = box.x + box.width * spec.cx;
  const cy = box.y + box.height * spec.cy;
  return {
    cx,
    cy,
    rx: box.width * spec.rx,
    ry: box.height * spec.ry,
    transform: spec.rotate ? `rotate(${spec.rotate} ${cx} ${cy})` : null,
  };
}

// 外接矩形のまわりに余白を足した範囲（切り抜きの mask に使う）
export function padBox(box, padding) {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}
