// 撫でた場所がわずかに沈む反応の値と計算。DOM には触れない。

export const PRESS = {
  // 沈む深さ：feDisplacementMap の scale。中心で、この半分（猫の座標で 2.5）だけ下へずれる
  depth: 5,
  // 沈む範囲の半径（猫の座標）
  radius: 40,
  // 撫で始めて沈みきるまでと、離してから戻りきるまでの時間（ミリ秒）
  pressMs: 150,
  releaseMs: 600,
  // 動きを減らす設定のときの戻る時間
  reducedReleaseMs: 150,
};

// これより目標に近づいたら、目標に着いたものとする
const SETTLE = 0.01;

// 今の値を、目標の値へ時間に合わせて近づける（指数的に近づき、durationMs でほぼ 95% まで進む）
export function approach(current, target, elapsedMs, durationMs) {
  if (durationMs <= 0) return target;
  const next = target + (current - target) * Math.exp((-3 * elapsedMs) / durationMs);
  return Math.abs(next - target) < SETTLE ? target : next;
}

// 目標の深さに合わせて、近づける時間を選ぶ（沈むときは速く、戻るときはゆっくり）
export function approachDuration(current, target, { reducedMotion = false } = {}, config = PRESS) {
  if (target > current) return config.pressMs;
  return reducedMotion ? config.reducedReleaseMs : config.releaseMs;
}

// 撫でている点を中心にした範囲を、沈み込みの地図の画像の位置と大きさに直す
export function dentArea(point, radius = PRESS.radius) {
  return { x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2 };
}
