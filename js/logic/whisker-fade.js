// ひげの濃淡の範囲の計算。DOM には触れない。
//
// ひげは鼻をはさんだ上下のマズルから、2束が反対向きに開く。
// どちらの束の根元も鼻のそばに集まるので、鼻の中心を円の中心にする。
// この円を放射状のグラデーションに使うと、どちらの束も根元が濃く、先ほど薄くなる

// 鼻の外接矩形とひげ全体の外接矩形（どちらも x, y, width, height）から、
// 中心（鼻の中心）と半径（中心から、ひげの外接矩形のいちばん遠い角まで）を返す
export function whiskerFadeCircle(noseBox, whiskerBox) {
  const cx = noseBox.x + noseBox.width / 2;
  const cy = noseBox.y + noseBox.height / 2;
  const xs = [whiskerBox.x, whiskerBox.x + whiskerBox.width];
  const ys = [whiskerBox.y, whiskerBox.y + whiskerBox.height];
  const r = Math.max(...xs.flatMap((x) => ys.map((y) => Math.hypot(x - cx, y - cy))));
  return { cx, cy, r };
}
