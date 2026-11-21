// ページ全体を指で引っぱる動きを止めるかどうかの判断。DOM に触れない。
// 画面側の処理は js/ui/page-pan.js にある

// 拡大していないとみなす倍率の上限。ピンチのあとに 1 ちょうどへ戻らないことがあるので、少し余裕を持たせる
export const UNZOOMED_SCALE = 1.01;

// 指1本で、拡大していないときだけ止める。
// 指2本以上（ピンチ）は止めないので、拡大はできる。
// 拡大しているときも止めないので、拡大した画面を指1本で見て回れる。
// scale が分からない（visualViewport がない）ときは、拡大していないものとして扱う
export function shouldBlockPan({ touchCount, scale = 1 }) {
  return touchCount === 1 && scale <= UNZOOMED_SCALE;
}
