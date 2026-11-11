// キーボードで撫でるときの計算（道すじ・位置の進め方・キーの割り当て）。DOM には触れない。
// 座標はすべて猫の SVG の座標（viewBox 800×400）、時刻はミリ秒。
// 画面の処理は js/cat/keyboard-stroke.js にある

export const KEYBOARD_STROKE = {
  // 押し続けているあいだに進む速さ（座標の単位／秒）。マウスでゆっくり撫でるくらい
  speed: 300,
  // 1フレームで進める時間の上限（タブが隠れていたときなどに、一気に飛ばないように）
  maxStepMs: 100,
  // 撫でる道すじ（折れ線）。上から下の順に並べる。
  // どれも始点が画面の左、終点が画面の右（→ で右へ、← で左へ進むように、矢印の向きとそろえる）
  routes: [
    {
      // 上：頭から背中。額 → 首の後ろ → 肩 → 背中 → 腰
      name: 'back',
      points: [
        { x: 120, y: 210 }, { x: 170, y: 190 }, { x: 225, y: 178 }, { x: 270, y: 155 },
        { x: 350, y: 128 }, { x: 450, y: 122 }, { x: 550, y: 140 }, { x: 610, y: 180 },
        { x: 625, y: 225 },
      ],
    },
    {
      // まん中：お腹。のど → 胸 → お腹 → 腰の下（前足はよける）
      name: 'belly',
      points: [
        { x: 245, y: 245 }, { x: 300, y: 210 }, { x: 400, y: 198 }, { x: 480, y: 205 },
        { x: 555, y: 218 }, { x: 600, y: 270 },
      ],
    },
    {
      // 下：しっぽ。前足の近くの先 → 床に沿って右へ → 腰に沿って上がり、腰の後ろの根元へ
      name: 'tail',
      points: [
        { x: 490, y: 340 }, { x: 540, y: 336 }, { x: 600, y: 330 }, { x: 635, y: 315 },
        { x: 648, y: 280 }, { x: 648, y: 238 },
      ],
    },
  ],
};

// キー → 動き。move：道すじに沿って進む向き（+1 で終点＝画面の右へ）/ route：道すじを替える向き（+1 で下へ）
const KEY_ACTIONS = {
  ArrowRight: { type: 'move', direction: 1 },
  ArrowLeft: { type: 'move', direction: -1 },
  ArrowUp: { type: 'route', step: -1 },
  ArrowDown: { type: 'route', step: 1 },
};

// KeyboardEvent.key から動きを求める。割り当てのないキーは null
export function keyAction(key) {
  return KEY_ACTIONS[key] ?? null;
}

const segmentLength = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// 折れ線の長さ
export function routeLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += segmentLength(points[i - 1], points[i]);
  return total;
}

// 始点から distance だけ進んだ点の座標。道すじの外の値は端にそろえる
export function pointAt(points, distance) {
  let left = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = segmentLength(a, b);
    if (left <= len && len > 0) {
      const t = left / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= len;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

// 押し続けた時間（elapsedMs）ぶん、direction（+1 / -1）の向きへ進めた距離。
// 道すじの端で止める。1回に進める時間には上限がある
export function advance(distance, direction, elapsedMs, length, config = KEYBOARD_STROKE) {
  const ms = clamp(elapsedMs, 0, config.maxStepMs);
  return clamp(distance + direction * config.speed * (ms / 1000), 0, length);
}

// 道すじを step（+1 / -1）だけ替えた先の番号。いちばん上・下で止める
export function nextRoute(index, step, count) {
  return clamp(index + step, 0, count - 1);
}

// 道すじの上で、point にいちばん近い位置（始点からの距離）
export function nearestDistance(points, point) {
  let best = { gap: Infinity, distance: 0 };
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = segmentLength(a, b);
    const t = len > 0
      ? clamp(((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / (len * len), 0, 1)
      : 0;
    const gap = Math.hypot(a.x + (b.x - a.x) * t - point.x, a.y + (b.y - a.y) * t - point.y);
    if (gap < best.gap) best = { gap, distance: start + len * t };
    start += len;
  }
  return best.distance;
}
