// 実機での確認用の小さな表示。URL に ?debug=1 を付けたときだけ、画面の左下に出す。
// ふだんは何も作らない

export function setupDebugPanel({ audioState, furState }) {
  if (new URLSearchParams(location.search).get('debug') !== '1') return;

  const panel = document.createElement('output');
  panel.className = 'debug-panel';
  document.body.append(panel);

  const events = [];
  const note = (type) => {
    events.unshift(type);
    events.length = Math.min(events.length, 3);
  };
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend']) {
    document.addEventListener(type, () => note(type), { passive: true, capture: true });
  }

  const render = () => {
    const fur = { live: 'フィルター', bitmap: '画像', error: 'フィルター（画像にできず）' }[furState()] ?? furState();
    panel.textContent = `音: ${audioState()}　毛: ${fur}　最近の操作: ${events.join(' / ') || 'なし'}`;
  };
  render();
  setInterval(render, 300);
}
