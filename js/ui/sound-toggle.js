// 音を消すボタン。ふつうの <button> に aria-pressed を付けて、オン・オフを伝える
// （aria-pressed="true" のとき消音）。選んだ状態は localStorage に覚えておく。
// localStorage が使えない環境では覚えないだけで、ボタンはそのまま使える

const STORAGE_KEY = 'purr:muted';

export function loadMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // 保存できなくても動きは変わらない
  }
}

// onChange(muted) は、ボタンを押した操作の中で呼ばれる（音の準備をしてよい）
export function setupSoundToggle(button, { muted, onChange }) {
  const render = (value) => button.setAttribute('aria-pressed', String(value));
  render(muted);
  button.hidden = false;
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    render(next);
    saveMuted(next);
    onChange(next);
  });
}
