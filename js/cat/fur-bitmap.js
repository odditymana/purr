// 毛の質感を一度だけ画像にして、毎フレームの毛のフィルターの計算をなくす。
// 毛のフィルターがかかったグループ（体・しっぽの先・前足・上の耳・頭）を、
// それぞれ独立した SVG に書き出して <canvas> で画像にし、元のグループの中に <image> として置く。
// - 呼吸・耳・しっぽの動きは、今までどおり外側のグループ（または元のグループ自身）で動かすので、画像も一緒に動く
// - 元の形は見えなくして（不透明度 0）残し、撫でる当たり判定に使う
// - 画面の大きさや倍率が変わったら描き直す
// - 途中で問題が起きたら、今までどおりフィルターで描く（console に知らせる）
// 位置と解像度の計算は js/logic/fur-bitmap.js にある

import { FUR_BITMAP, rasterPlan, localUrlRef } from '../logic/fur-bitmap.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FUR_FILTER = 'url(#fur)';

// 独立した SVG の中でもページと同じ見た目になるよう、書き込む CSS の値
const SHAPE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'opacity', 'display', 'visibility'];
const PAINT_SERVER_PROPS = ['stop-color', 'stop-opacity', 'flood-color', 'flood-opacity'];

// 元の要素と複製を同じ順にたどり、計算された CSS の値を複製の style に書き込む
function inlineStyles(original, clone, props) {
  const computed = getComputedStyle(original);
  const declarations = props
    .map((p) => [p, computed.getPropertyValue(p)])
    .filter(([, v]) => v !== '')
    .map(([p, v]) => `${p}:${localUrlRef(v)}`);
  if (declarations.length > 0) clone.setAttribute('style', declarations.join(';'));
  clone.removeAttribute('class');
  const a = original.children, b = clone.children;
  for (let i = 0; i < a.length; i++) inlineStyles(a[i], b[i], props);
}

// 1つのグループを、それだけで描ける独立した SVG（文字列）にする。variant で中身を少し変えられる
function standaloneSvg(group, plan, variant) {
  const doc = group.ownerDocument;
  const pageDefs = group.ownerSVGElement.querySelector('defs');

  const defs = pageDefs.cloneNode(true);
  inlineStyles(pageDefs, defs, PAINT_SERVER_PROPS); // 形の部品には書き込まない（使う側の塗りを受け継ぐため）

  const body = group.cloneNode(true);
  inlineStyles(group, body, SHAPE_PROPS);
  body.removeAttribute('transform');
  body.removeAttribute('id');
  body.setAttribute('filter', FUR_FILTER);
  variant?.(body);

  // <use> が defs の外の要素（しっぽの絵など）を参照していたら、それも defs に入れる
  const have = new Set([...defs.querySelectorAll('[id]'), ...body.querySelectorAll('[id]')].map((el) => el.id));
  for (const use of body.querySelectorAll('use')) {
    const id = (use.getAttribute('href') ?? '').slice(1);
    if (id && !have.has(id)) {
      const original = doc.getElementById(id);
      if (!original) continue;
      const copy = original.cloneNode(true);
      inlineStyles(original, copy, SHAPE_PROPS);
      defs.append(copy);
      have.add(id);
    }
  }

  const root = doc.createElementNS(SVG_NS, 'svg');
  root.setAttribute('xmlns', SVG_NS);
  root.setAttribute('width', plan.pixelWidth);
  root.setAttribute('height', plan.pixelHeight);
  root.setAttribute('viewBox', `${plan.x} ${plan.y} ${plan.width} ${plan.height}`);
  root.append(defs, body);
  return new XMLSerializer().serializeToString(root);
}

// 独立した SVG を canvas に描いて、PNG の画像（object URL）にする
async function rasterize(svgText, plan) {
  const svgUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = svgUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = plan.pixelWidth;
    canvas.height = plan.pixelHeight;
    canvas.getContext('2d').drawImage(img, 0, 0, plan.pixelWidth, plan.pixelHeight);
    // SVG を描いた canvas を画像にできないブラウザでは、ここで例外になる
    const png = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('画像にできませんでした'))), 'image/png');
    });
    return URL.createObjectURL(png);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function imageElement(url, plan, className) {
  const image = document.createElementNS(SVG_NS, 'image');
  image.setAttribute('href', url);
  image.setAttribute('x', plan.x);
  image.setAttribute('y', plan.y);
  image.setAttribute('width', plan.width);
  image.setAttribute('height', plan.height);
  image.setAttribute('preserveAspectRatio', 'none');
  image.setAttribute('class', className);
  return image;
}

export function createFurBitmaps(svg, { config = FUR_BITMAP } = {}) {
  const groups = [...svg.querySelectorAll(`[filter="${FUR_FILTER}"]`)];
  let state = 'live'; // live（フィルターで描いている）/ bitmap（画像）/ error
  let flashImage = null;
  let urls = [];
  let busy = null;

  async function render() {
    // 画像にする前の見た目を読み取るため、いったん元に戻す（同期で行うので画面には出ない）
    for (const g of groups) g.classList.remove('fur-rasterized');

    const ctm = svg.getScreenCTM();
    // 画面の倍率どおりの解像度で描く（ぼやけないように）
    const dpr = window.devicePixelRatio || 1;
    const pixelsPerUnit = ctm.a * dpr;
    const offset = { x: ctm.e * dpr, y: ctm.f * dpr };

    const jobs = groups.map((group) => {
      const plan = rasterPlan(group.getBBox(), pixelsPerUnit, offset, config);
      const isTip = group.id === 'tail-tip';
      const main = standaloneSvg(group, plan);
      // しっぽの先：持ち上がる一瞬に明るくなる上の縁のツヤも、別の画像にする
      const flash = isTip
        ? standaloneSvg(group, plan, (body) => {
          body.querySelector('#tail-flash')?.style.setProperty('opacity', '1');
          for (const use of body.querySelectorAll('use[href="#tail-art"]')) use.style.setProperty('display', 'none');
        })
        : null;
      return { group, plan, main, flash };
    });
    if (state === 'bitmap') for (const g of groups) g.classList.add('fur-rasterized');

    // すべて画像にできてから、まとめて入れ替える（途中で失敗したら、今の描き方のまま）
    const done = await Promise.all(jobs.map(async (job) => ({
      ...job,
      mainUrl: await rasterize(job.main, job.plan),
      flashUrl: job.flash ? await rasterize(job.flash, job.plan) : null,
    })));

    const oldUrls = urls;
    urls = [];
    flashImage = null;
    for (const { group, plan, mainUrl, flashUrl } of done) {
      group.querySelectorAll(':scope > .fur-bitmap').forEach((el) => el.remove());
      const images = [];
      if (flashUrl) {
        flashImage = imageElement(flashUrl, plan, 'fur-bitmap tail-flash-bitmap');
        images.push(flashImage);
        urls.push(flashUrl);
      }
      images.push(imageElement(mainUrl, plan, 'fur-bitmap'));
      urls.push(mainUrl);
      group.prepend(...images);
      group.removeAttribute('filter');
      group.classList.add('fur-rasterized');
    }
    oldUrls.forEach((u) => URL.revokeObjectURL(u));
    state = 'bitmap';
  }

  function redraw() {
    if (busy) return busy;
    busy = render()
      .catch((error) => {
        // 画像にできなければ、フィルターで描く元の作りに戻す
        for (const g of groups) {
          g.classList.remove('fur-rasterized');
          g.setAttribute('filter', FUR_FILTER);
          g.querySelectorAll(':scope > .fur-bitmap').forEach((el) => el.remove());
        }
        flashImage = null;
        state = 'error';
        console.warn(`PURR：毛を画像にできなかったので、フィルターで描きます。${error.message}`);
      })
      .finally(() => {
        busy = null;
      });
    return busy;
  }

  // 画面の大きさ・向き・倍率が変わったら、少し待ってから描き直す
  let timer = null;
  const later = () => {
    if (state === 'error') return;
    clearTimeout(timer);
    timer = setTimeout(redraw, config.redrawDelayMs);
  };
  window.addEventListener('resize', later);
  const watchDpr = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
      later();
      watchDpr();
    }, { once: true });
  };
  watchDpr();

  return {
    ready: redraw(),
    state: () => state,
    flash: () => flashImage,
  };
}
