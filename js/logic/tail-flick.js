// 撫でているあいだ、しっぽの先がときどきぱたっと持ち上がるときの値と、上の縁のツヤの計算。
// 待ち時間・回数・回転のキーフレームの計算は js/logic/twitch.js にある

export const TAIL_FLICK = {
  // 次に動くまでの待ち時間（ミリ秒）。撫で始めてからの最初の1回も、この範囲だけ待つ
  minIntervalMs: 1500,
  maxIntervalMs: 4000,
  // 2回続けて動く確率と、2回目までの間（ミリ秒）
  doubleChance: 0.2,
  doubleGapMs: 200,
  // 持ち上がる角度（度）。正の値で、左を向いたしっぽの先が上がる
  angleDeg: 12,
  // 素早く持ち上がる時間と、少しゆっくり戻る時間（ミリ秒）
  moveMs: 120,
  returnMs: 350,
  // 持ち上がる一瞬だけ、上の縁のツヤを明るくする（いちばん強いときの不透明度。控えめに）
  flashOpacity: 0.3,
};

// 上の縁のツヤを明るくするキーフレーム（Web Animations API の形）。
// 回転と同じ長さで、持ち上がりきる時刻にいちばん明るくなり、戻りながら消える
export function flashKeyframes(config = TAIL_FLICK) {
  const peak = config.moveMs / (config.moveMs + config.returnMs);
  return [
    { opacity: 0, offset: 0, easing: 'ease-out' },
    { opacity: config.flashOpacity, offset: peak, easing: 'ease-in' },
    { opacity: 0, offset: 1 },
  ];
}
