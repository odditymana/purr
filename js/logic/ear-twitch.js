// 上の耳（earFar）が、ときどきぴくっと動くときの値。
// 待ち時間・回数・キーフレームの計算は js/logic/twitch.js にある

export const EAR_TWITCH = {
  // 次に動くまでの待ち時間（ミリ秒）
  minIntervalMs: 6000,
  maxIntervalMs: 15000,
  // 2回続けて動く確率と、2回目までの間（ミリ秒）
  doubleChance: 0.25,
  doubleGapMs: 350,
  // 倒れる角度（度）。正の値で、耳の先が背中の側（右上）へ寝る
  angleDeg: 12,
  // 素早く倒れる時間と、少しゆっくり戻る時間（ミリ秒）
  moveMs: 170,
  returnMs: 350,
};
