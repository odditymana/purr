// 猫の部位（assets/cat-shape.svg の id）と、その照合。DOM には触れない。

// 読み込む部位。並びは cat-shape.svg の重なり順（奥から手前）
export const PARTS = [
  'hindLeg', 'body', 'belly', 'tail', 'earFar', 'earNear', 'head', 'frontLegs',
  'eye', 'nose', 'mouth', 'whiskers',
];

// 形のファイルにある id の一覧と照らし合わせ、足りない部位と想定外の id を返す
export function compareIds(foundIds, parts = PARTS) {
  const found = new Set(foundIds);
  const expected = new Set(parts);
  return {
    missing: parts.filter((name) => !found.has(name)),
    unknown: [...found].filter((id) => !expected.has(id)),
  };
}
