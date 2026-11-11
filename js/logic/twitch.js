// 耳やしっぽが「ときどき、ぴくっと動いて戻る」ときの共通の計算。DOM には触れない。
// 値（間隔・角度・速さ）は、動かす部位ごとのファイルにある（ear-twitch.js・tail-flick.js）。
//
// 値の形：
//   minIntervalMs, maxIntervalMs：次に動くまでの待ち時間の範囲（ミリ秒）。この範囲から一様に選ぶ
//   doubleChance：2回続けて動く確率
//   doubleGapMs：2回続けるときの、1回目が終わってから2回目までの間（ミリ秒）
//   angleDeg：動く角度（度）
//   moveMs, returnMs：素早く動く時間と、少しゆっくり戻る時間（ミリ秒）

// 次の動きの予定を決める。random は 0 以上 1 未満を返す関数（Math.random など）。
// 待ち時間と回数で1回ずつ乱数を使う
export function planTwitch(random, config) {
  const span = config.maxIntervalMs - config.minIntervalMs;
  const delayMs = config.minIntervalMs + random() * span;
  const count = random() < config.doubleChance ? 2 : 1;
  return { delayMs, count };
}

// 1回分の動きのキーフレーム（Web Animations API の形）と長さ。
// 動くところは素早く減速し、戻るところはゆっくり加速・減速する
export function twitchKeyframes(config) {
  const durationMs = config.moveMs + config.returnMs;
  return {
    durationMs,
    keyframes: [
      { transform: 'rotate(0deg)', offset: 0, easing: 'ease-out' },
      { transform: `rotate(${config.angleDeg}deg)`, offset: config.moveMs / durationMs, easing: 'ease-in-out' },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
  };
}
