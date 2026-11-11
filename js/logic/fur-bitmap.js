// 毛の質感を一度だけ画像にするときの、位置と解像度の計算。DOM には触れない。
// 画像を作って置き換える処理は js/cat/fur-bitmap.js にある

export const FUR_BITMAP = {
  // 毛先は形の輪郭から外へはみ出す（ずらし・にじみ）ので、外接矩形のまわりに足す余白（猫の座標）
  margin: 24,
  // 1枚の画像の画素数の上限。iPhone の Safari は大きすぎる canvas を作れないので、超えたら解像度を下げる
  maxPixels: 4096 * 4096,
  // 画面の大きさや倍率が変わってから描き直すまでの待ち時間（ミリ秒）
  redrawDelayMs: 250,
};

// 外接矩形（猫の座標）と、猫の座標 1 あたりの画面の画素数から、
// 画像を置く範囲（猫の座標）と、画像の画素数を決める。
// offset は、猫の座標の原点が画面のどの画素の位置に来るか（小数を含む）。
// 範囲の端は、画面の画素の境目にそろえる（画像の画素と画面の画素がずれて、にじまないように）
export function rasterPlan(box, pixelsPerUnit, offset = { x: 0, y: 0 }, config = FUR_BITMAP) {
  let scale = pixelsPerUnit;
  const snap = (v, s, o) => (Math.floor(v * s + o) - o) / s;
  const snapUp = (v, s, o) => (Math.ceil(v * s + o) - o) / s;

  let plan;
  for (let i = 0; i < 8; i++) {
    const x = snap(box.x - config.margin, scale, offset.x);
    const y = snap(box.y - config.margin, scale, offset.y);
    const right = snapUp(box.x + box.width + config.margin, scale, offset.x);
    const bottom = snapUp(box.y + box.height + config.margin, scale, offset.y);
    const pixelWidth = Math.round((right - x) * scale);
    const pixelHeight = Math.round((bottom - y) * scale);
    plan = { x, y, width: right - x, height: bottom - y, pixelWidth, pixelHeight, scale };
    if (pixelWidth * pixelHeight <= config.maxPixels) return plan;
    // 上限を超えたら、面積が収まるところまで解像度を下げてやり直す
    scale *= Math.sqrt(config.maxPixels / (pixelWidth * pixelHeight)) * 0.99;
  }
  return plan;
}

// 計算された CSS の値に入っている url(...) を、同じ文書の中の参照（url(#id)）に直す。
// ブラウザによっては url("http://…/index.html#fur-base") のように返すため、
// 書き出した独立した SVG の中でも参照できるようにする
export function localUrlRef(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/url\(\s*["']?[^"')]*?(#[^"')]+)["']?\s*\)/g, 'url($1)');
}
