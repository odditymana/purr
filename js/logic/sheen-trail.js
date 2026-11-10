// 撫でた跡に走る、毛並みのツヤの筋（毛筋）の値と計算。DOM には触れない。
// 座標は猫の SVG の座標（viewBox 800×400）、速さは座標の単位／秒、時刻はミリ秒

export const SHEEN = {
  // 道すじに沿って毛筋を置く間隔。毛筋の長さより短くして隣どうしを重ね、点線に見えないようにする
  spacing: 4,
  // 毛筋の長さ：ゆっくり撫でると短く、速く撫でると長い
  slowLength: 10,
  fastLength: 22,
  // 毛筋の濃さ：ゆっくり撫でると濃く、速く撫でると薄い。
  // 隣どうしが重なって濃さが足されるので、1本ずつはごく薄くする
  // （重なった見た目の濃さは、ゆっくりで約 0.4、速いと約 0.3）
  slowOpacity: 0.2,
  fastOpacity: 0.07,
  // 速さの目安：これより遅ければ「ゆっくり」、速ければ「速い」として扱う
  slowSpeed: 80,
  fastSpeed: 800,
  // 道すじから横へずらす量の最大（1本の太い線ではなく、毛並みの中の光に見せる）
  jitter: 2.5,
  // 消えるまでの時間（動きを減らす設定のときは短く）
  fadeMs: 1500,
  reducedFadeMs: 400,
  // 同時に出しておく毛筋の上限（多すぎると描く負担が増える）
  maxStrands: 120,
};

// 速さを 0（ゆっくり）〜 1（速い）の割合に直す
export function speedRatio(speed, config = SHEEN) {
  const t = (speed - config.slowSpeed) / (config.fastSpeed - config.slowSpeed);
  return Math.min(1, Math.max(0, t));
}

// from から to までのあいだに、間隔ごとに毛筋を置く位置を返す。
// carry は、前の区間で間隔に足りずに余った距離。返す carry を次の区間に渡す
export function strandPositions(from, to, carry, spacing = SHEEN.spacing) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const points = [];
  let along = spacing - carry; // この区間で最初に置く位置（区間の始まりからの距離）
  while (along <= length) {
    const t = along / length;
    points.push({ x: from.x + dx * t, y: from.y + dy * t });
    along += spacing;
  }
  return { points, carry: length - (along - spacing) };
}

// 1本の毛筋の形。向き（direction：撫でた向きのベクトル）にそろえ、
// 横へ random に応じて少しずらす。random は 0 以上 1 未満を返す関数
export function strandShape(point, direction, speed, random, config = SHEEN) {
  const norm = Math.hypot(direction.x, direction.y) || 1;
  const ux = direction.x / norm;
  const uy = direction.y / norm;
  const ratio = speedRatio(speed, config);
  const length = config.slowLength + (config.fastLength - config.slowLength) * ratio;
  const opacity = config.slowOpacity + (config.fastOpacity - config.slowOpacity) * ratio;
  const offset = (random() * 2 - 1) * config.jitter;
  // 撫でた向きに直角な方向へずらす
  const cx = point.x - uy * offset;
  const cy = point.y + ux * offset;
  const half = length / 2;
  return {
    x1: cx - ux * half,
    y1: cy - uy * half,
    x2: cx + ux * half,
    y2: cy + uy * half,
    opacity,
  };
}

// 生まれてからの時間に対する濃さの倍率（1 → 0）。
// 消え始めはゆるやかに、最後はすっと消える（1 - t² の曲線）
export function fadeFactor(ageMs, fadeMs) {
  if (fadeMs <= 0 || ageMs >= fadeMs) return 0;
  if (ageMs <= 0) return 1;
  const t = ageMs / fadeMs;
  return 1 - t * t;
}

// 消え終わったものと、上限を超えた古いものを除いた一覧を返す（strands は古い順）
export function pruneStrands(strands, now, fadeMs, maxStrands = SHEEN.maxStrands) {
  const alive = strands.filter((s) => now - s.born < fadeMs);
  return alive.slice(Math.max(0, alive.length - maxStrands));
}
