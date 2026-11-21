// ページ全体を指で引っぱる動きを止める。
// iPhone の Safari では、スクロールするものがないページでも、指1本のスワイプで画面ごと少し動く。
// CSS（overflow: hidden・overscroll-behavior: none）だけでは止まらないので、
// touchmove の既定の動きを止める。止めるかどうかの判断は js/logic/page-pan.js にある。
// touchmove だけを止めるので、タップ（ボタンの click や touchend）はそのまま届く

import { shouldBlockPan } from '../logic/page-pan.js';

export function preventPagePan() {
  document.addEventListener('touchmove', (event) => {
    const touchCount = event.touches.length;
    const scale = window.visualViewport?.scale;
    if (event.cancelable && shouldBlockPan({ touchCount, scale })) event.preventDefault();
  }, { passive: false });
}
