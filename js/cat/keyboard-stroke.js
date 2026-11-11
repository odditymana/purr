// キーボードで撫でる。猫にフォーカスがあるとき、矢印キーで撫でる。
// - ← → ：今の道すじに沿って撫でる（→ で画面の右へ、← で左へ）。押し続けるあいだ撫で続け、離すと撫で終わり
// - ↑ ↓ ：撫でる道すじ（頭から背中・お腹・しっぽ）を替える。替えた先では、今の点にいちばん近い位置から始める
// - キーのくり返し（オートリピート）は使わず、押してから離すまで、描き直しのたびに一定の速さで進める
// - フォーカスが外れたら撫で終わりにする
// - 撫でている位置に、小さな印（marker）を出す。見せるかどうかは CSS で決める（キーボードのときだけ）
// マウス・タッチと同じ形の知らせ（onPress / onStart / onMove / onEnd）を出す。
// 道すじと進め方の計算は js/logic/keyboard-stroke.js にある

import {
  KEYBOARD_STROKE, keyAction, routeLength, pointAt, advance, nextRoute, nearestDistance,
} from '../logic/keyboard-stroke.js';
import { partAt } from './stroke-input.js';

// 猫の SVG の座標を、画面の座標に直す
function toClientPoint(svg, point) {
  return new DOMPoint(point.x, point.y).matrixTransform(svg.getScreenCTM());
}

export function watchKeyboardStrokes(svg, marker, { onPress = () => {}, onStart, onMove, onEnd }, config = KEYBOARD_STROKE) {
  const routes = config.routes.map((r) => ({ ...r, length: routeLength(r.points) }));
  let routeIndex = 0;
  let distance = 0;
  let held = []; // 押している ← → のキー（押した順）。最後に押したキーの向きへ進む
  let stroking = false;
  let part = null;
  let moving = false; // 前のフレームで進んだか
  let frame = null;
  let lastTime = 0;

  const route = () => routes[routeIndex];
  const point = () => pointAt(route().points, distance);

  function setPart(value) {
    if (value) svg.dataset.strokePart = value;
    else delete svg.dataset.strokePart;
  }

  // 点の真下の部位。猫の外に出ることはないはずだが、外れたら直前の部位のままにする
  function partAtPoint(p) {
    const client = toClientPoint(svg, p);
    return partAt(svg, client.x, client.y) ?? part ?? 'body';
  }

  function showMarker() {
    const p = point();
    marker.setAttribute('cx', p.x);
    marker.setAttribute('cy', p.y);
  }

  function info(speed) {
    const p = point();
    part = partAtPoint(p);
    return { part, x: p.x, y: p.y, speed };
  }

  function start() {
    if (stroking) return;
    onPress();
    stroking = true;
    moving = false;
    const stroke = info(0);
    setPart(stroke.part);
    onStart(stroke);
    lastTime = performance.now();
    frame = requestAnimationFrame(step);
  }

  function end() {
    cancelAnimationFrame(frame);
    frame = null;
    if (!stroking) return;
    stroking = false;
    setPart(null);
    onEnd();
  }

  function step(now) {
    frame = null;
    if (!stroking || held.length === 0) return;
    const direction = keyAction(held[held.length - 1]).direction;
    const next = advance(distance, direction, now - lastTime, route().length, config);
    lastTime = now;
    if (next !== distance) {
      distance = next;
      moving = true;
      const stroke = info(config.speed);
      setPart(stroke.part);
      showMarker();
      onMove(stroke);
    } else if (moving) {
      // 道すじの端に着いた：押しているあいだは撫でている扱いのまま、速さだけ 0 にする
      moving = false;
      onMove(info(0));
    }
    frame = requestAnimationFrame(step);
  }

  function changeRoute(stepBy) {
    const index = nextRoute(routeIndex, stepBy, routes.length);
    if (index === routeIndex) return;
    // 撫でている途中なら、いったん撫で終わりにして、新しい道すじで撫で直す（筋が道すじの間を飛ばないように）
    const wasStroking = stroking;
    end();
    distance = nearestDistance(routes[index].points, point());
    routeIndex = index;
    showMarker();
    if (wasStroking) start();
  }

  svg.addEventListener('keydown', (event) => {
    const action = keyAction(event.key);
    if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
    // 矢印キーでページがスクロールしないようにする
    event.preventDefault();
    // キーボードで操作していることを CSS に知らせる（撫でている位置の印を出す）
    svg.dataset.keyboard = '';
    if (event.repeat) return;
    if (action.type === 'route') {
      changeRoute(action.step);
      return;
    }
    held = [...held.filter((k) => k !== event.key), event.key];
    start();
  });

  svg.addEventListener('keyup', (event) => {
    if (keyAction(event.key)?.type !== 'move') return;
    held = held.filter((k) => k !== event.key);
    if (held.length === 0) end();
  });

  svg.addEventListener('blur', () => {
    held = [];
    end();
    delete svg.dataset.keyboard;
  });

  // マウスやタッチで触れたら、印は隠す（キーボードで操作し直したら、また出す）
  svg.addEventListener('pointerdown', () => {
    delete svg.dataset.keyboard;
  });

  showMarker();
}
