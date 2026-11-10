// 上の耳（earFar）が、ときどきぴくっと動くときの値と計算。DOM には触れない。

// 動きの値（あとで調整しやすいよう、ここにまとめる）
export const EAR_TWITCH = {
  // 次に動くまでの待ち時間（ミリ秒）。この範囲から一様に選ぶ
  minIntervalMs: 6000,
  maxIntervalMs: 15000,
  // 2回続けて動く確率
  doubleChance: 0.25,
  // 2回続けるときの、1回目が終わってから2回目までの間（ミリ秒）
  doubleGapMs: 350,
  // 倒れる角度（度）。正の値で、耳の先が背中の側（右上）へ寝る
  angleDeg: 12,
  // 素早く倒れる時間と、少しゆっくり戻る時間（ミリ秒）
  downMs: 170,
  upMs: 350,
};

// 次の動きの予定を決める。random は 0 以上 1 未満を返す関数（Math.random など）。
// 待ち時間と回数で1回ずつ乱数を使う
export function planTwitch(random, config = EAR_TWITCH) {
  const span = config.maxIntervalMs - config.minIntervalMs;
  const delayMs = config.minIntervalMs + random() * span;
  const count = random() < config.doubleChance ? 2 : 1;
  return { delayMs, count };
}

// 1回分の動きのキーフレーム（Web Animations API の形）と長さ。
// 倒れるところは素早く減速し、戻るところはゆっくり加速・減速する
export function twitchKeyframes(config = EAR_TWITCH) {
  const durationMs = config.downMs + config.upMs;
  return {
    durationMs,
    keyframes: [
      { transform: 'rotate(0deg)', offset: 0, easing: 'ease-out' },
      { transform: `rotate(${config.angleDeg}deg)`, offset: config.downMs / durationMs, easing: 'ease-in-out' },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
  };
}
