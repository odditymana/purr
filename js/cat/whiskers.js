// ひげの濃淡を、ひげの位置に合わせる。
// 放射状のグラデーションの中心を鼻の中心（2束の根元のあいだ）に、半径をいちばん遠い先に合わせる
// （計算は js/logic/whisker-fade.js）

import { whiskerFadeCircle } from '../logic/whisker-fade.js';

export function fitWhiskerFade(noseUse, whiskersUse, gradient) {
  const whiskerBox = whiskersUse.getBBox();
  if (whiskerBox.width === 0 || whiskerBox.height === 0) return;

  const { cx, cy, r } = whiskerFadeCircle(noseUse.getBBox(), whiskerBox);
  for (const [name, value] of [['cx', cx], ['cy', cy], ['fx', cx], ['fy', cy], ['r', r]]) {
    gradient.setAttribute(name, value);
  }
}
