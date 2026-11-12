# PURR

このアプリはゴミアプリです。\
初めに言っておきます。\
でも、私はこのアプリが好きです。\
猫を撫でるだけのアプリです。\
それ以上でも、それ以下でもありません。

## 制作のきっかけ

ハローワークの帰り道、昼寝をしている猫を見かけました。\
撫でたいな、と思いました。\
このアプリは、そこから生まれました。

---

**→ [https://odditymana.github.io/purr/](https://odditymana.github.io/purr/)**

[![テスト](https://github.com/odditymana/purr/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/odditymana/purr/actions/workflows/test.yml)

## 遊び方

- **撫でる**：マウスやタッチで、猫の上をなぞる
- **キーボード**：Tab で猫にフォーカスし、← → で撫でる。↑ ↓ で撫でる場所（頭から背中・お腹・しっぽ）を変える
- **音を消すボタン**：右上のボタンで、ゴロゴロの音を消す。状態はブラウザの中（localStorage）に保存する
- iPhone では、マナーモードのときは音が鳴らない

## 技術

- HTML・CSS・JavaScript のみ（フレームワーク・ライブラリなし、ES Modules）
- 画像ファイルも音声ファイルも使わず、コードで描いている
  - 猫：自作の SVG
  - 毛並み：SVG のフィルター
  - ゴロゴロの音：Web Audio で合成
- 入力：マウスとタッチは Pointer Events でまとめて扱う。キーボードでも操作できる
- `prefers-reduced-motion` のときは、呼吸・耳・しっぽの動きを止める
- 外部との通信はない

## 手元で動かす

JavaScript を ES Modules に分けているため、`index.html` をダブルクリックで開く（`file://`）と動きません。簡易サーバーを使ってください。

```sh
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

## テスト

計算の部分（`js/logic/`）を、Node.js に標準で入っている `node:test` で確かめています（Node.js 22 以降）。

```sh
npm test
```

main への push と pull request のたびに、GitHub Actions で自動で走ります。

## ライセンス

[MIT License](LICENSE)
