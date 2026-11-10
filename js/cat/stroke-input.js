// 撫でる操作を受け取る。マウスとタッチは Pointer Events でまとめて扱う。
// - 猫の上で押し、一定の距離を動いたら「撫でている」とみなす
// - 撫でている部位（head・body・belly・tail・frontLegs）を svg の data-stroke-part に入れる
// - 猫の上で触れたときだけ、スマホの画面のスクロールを止める
// 距離・速さ・部位のまとめ方の計算は js/logic/stroke.js にある

import {
  STROKE, strokePartOf, shapeNameFromHref, distance, addSample, strokeSpeed, isStroking,
} from '../logic/stroke.js';

// 画面の座標を、猫の SVG の座標に直す
function toSvgPoint(svg, clientX, clientY) {
  return new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM().inverse());
}

// 画面の座標の真下にある、猫の撫でる部位。猫の外なら null
function partAt(svg, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !svg.contains(el)) return null;
  const name = el.closest('[data-part]')?.dataset.part ?? shapeNameFromHref(el.getAttribute('href'));
  return strokePartOf(name);
}

// onStart / onMove / onEnd に { part, x, y, speed } を渡して知らせる（onEnd は引数なし）
export function watchStrokes(svg, { onStart, onMove, onEnd }, config = STROKE) {
  let active = null; // 押している最中のポインタの記録

  function setPart(part) {
    if (part) svg.dataset.strokePart = part;
    else delete svg.dataset.strokePart;
  }

  function end() {
    if (active?.stroking) onEnd();
    setPart(null);
    active = null;
  }

  svg.addEventListener('pointerdown', (event) => {
    if (active || !event.isPrimary) return;
    if (!partAt(svg, event.clientX, event.clientY)) return;
    // マウスでドラッグしたときに、文字の選択や画像のドラッグが始まらないようにする
    event.preventDefault();
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    active = {
      id: event.pointerId,
      last: point,
      travelled: 0,
      samples: [{ x: point.x, y: point.y, t: event.timeStamp }],
      stroking: false,
    };
    svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener('pointermove', (event) => {
    if (!active || event.pointerId !== active.id) return;
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    active.travelled += distance(active.last, point);
    active.last = point;
    active.samples = addSample(active.samples, { x: point.x, y: point.y, t: event.timeStamp }, config.speedWindowMs);

    const part = partAt(svg, event.clientX, event.clientY);
    const info = { part, x: point.x, y: point.y, speed: strokeSpeed(active.samples) };

    if (!part) {
      // 押したまま猫の外へ出たら、いったん撫でるのをやめる（戻ってきたら再開する）
      if (active.stroking) {
        active.stroking = false;
        onEnd();
      }
      setPart(null);
      return;
    }

    setPart(active.stroking || isStroking(active.travelled, config) ? part : null);
    if (active.stroking) {
      onMove(info);
    } else if (isStroking(active.travelled, config)) {
      active.stroking = true;
      onStart(info);
    }
  });

  for (const type of ['pointerup', 'pointercancel']) {
    svg.addEventListener(type, (event) => {
      if (active && event.pointerId === active.id) end();
    });
  }

  // SVG の中の要素では touch-action が効かないブラウザがあるので、
  // 猫の上で触れたときだけ、タッチの既定の動き（スクロール）を止める
  svg.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    if (touch && partAt(svg, touch.clientX, touch.clientY)) event.preventDefault();
  }, { passive: false });
}
