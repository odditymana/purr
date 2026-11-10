// ひげの濃淡を、ひげ全体の左右の範囲に合わせる（左の根元が濃く、右の先が薄い）
export function fitWhiskerFade(use, gradient) {
  const box = use.getBBox();
  if (box.width === 0) return;
  gradient.setAttribute('x1', box.x);
  gradient.setAttribute('x2', box.x + box.width);
}
