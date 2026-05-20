# Artboard v1 UI Spec

## 目的

`artboard-v1` は、商品プレビューアプリ全体で共通利用する UI テーマである。

主な目的は以下。

- 上部ヘッダー、商品名行、操作エリア、プレビューエリアの見た目を統一する
- 商品ごとの差分は `products/*.json` に閉じ込める
- 共通レイアウトや共通スタイルは `index.html` / `styles.css` / `src/ui.js` で管理する
- 新しい商品に UI を適用するとき、JSON 追加だけで基本形を再利用できるようにする

このドキュメントは、2026-05-20 時点の `artboard-v1` の現行仕様をまとめたもの。

## source of truth

UI 構造と見た目の source of truth は以下。

- `/Users/hrkhgsn/Desktop/お菓子合成App/index.html`
- `/Users/hrkhgsn/Desktop/お菓子合成App/styles.css`
- `/Users/hrkhgsn/Desktop/お菓子合成App/src/ui.js`
- `/Users/hrkhgsn/Desktop/お菓子合成App/src/product-loader.js`
- `/Users/hrkhgsn/Desktop/お菓子合成App/products/*.json`

見た目の最終調整値は CSS に存在するため、デザイン判断時は必ず `styles.css` と実画面の両方を確認すること。

## 適用方法

2026-05-20 時点では、共通UIの既定テーマも `artboard-v1` である。

そのため、商品 JSON に明示的な `ui.theme` がなくても、通常は `artboard-v1` が適用される。

商品 JSON に以下を持たせると、参照アートボードや商品名ラベルを含めた `artboard-v1` の設定を明示できる。

```json
{
  "ui": {
    "theme": "artboard-v1",
    "artboard": {
      "width": 1512,
      "height": 850
    },
    "productHeadingLabel": "商品名"
  }
}
```

### `ui` の意味

- `theme`
  - 使用する UI テーマ名
- `artboard.width`
  - デザイン参照用アートボード幅
- `artboard.height`
  - デザイン参照用アートボード高さ
- `productHeadingLabel`
  - 商品名行の左ラベル

## レイアウト構成

### 全体

- 1 ページ 1 商品プレビュー構成
- 上部にブランドヘッダー
- その下に `商品名` + 商品タイトル行
- 本体は左右 2 カラム
  - 左: 操作エリア
  - 右: プレビューエリア

### 2 カラム

`artboard-v1` のデスクトップ基準では以下。

- レイアウト全体幅: `min(1164px, 100%)`
- 左カラム: `minmax(468px, 522px)`
- 右カラム: `minmax(0, 576px)`
- カラム間 gap: `65px`
- レイアウト全体は中央配置

### 商品名行

- タイトル行と商品名行の間隔: `28px`
- 商品名行は操作エリアの左端に揃える
- `商品名` と商品タイトルの間隔: `1em`

## ヘッダー仕様

### ブランドタイトル

対象:

- `Noveoka Design Viewer`

現行値:

- font-family: `body` 継承
  - `"Hiragino Sans", "Yu Gothic", sans-serif`
- font-size: `1.98rem`
- font-weight: `500`

### ブランドサブタイトル

対象:

- `ノベルティのお菓子屋さん　ノベオカデザインビューワー`

現行値:

- font-size: `0.875rem`
- 実質 `14px`
- font-weight: `500`

### ロゴ

現行値:

- ロゴ幅: `50px`

## 商品名行仕様

### 左ラベル

対象:

- `商品名`

現行値:

- font-size: `1.2rem`
- 実質 `19.2px`
- font-weight: `500`

### 右タイトル

対象:

- 商品 JSON の `title` から末尾 `プレビュー` を除いたもの

現行値:

- font-size: `1.2rem`
- 実質 `19.2px`
- font-weight: `500`

## 操作エリア仕様

### パネル

- 背景: 白
- 外枠: `1px solid #c7ced9`
- border-radius: `24px`
- シャドウなし

### 項目見出し

対象:

- `1. デザイン画像を読み込む`
- `2. 画像を調整する`
- `3. テキストを入力する`
- `4. デザインを確定する`
- `5. ZIPをダウンロードする`

現行値:

- font-size: `1.1rem`
- font-weight: `500`

### 項目ラベル

対象:

- `デザイン画像`
- `拡大率`
- `角度`
- `1行目`
- `2行目`
- `3行目`
- `保存形式`

現行値:

- font-size: `0.98rem`
- font-weight: `500`

### 補足テキスト

対象:

- `画像はプレビュー上で...`
- `文字を入力しない行には...`
- `書き出し画像は...`

現行値:

- font-size: `0.8125rem`
- 実質 `13px`
- line-height: `1.45`

### 入力欄

- border: `1px solid #141414`
- border-radius: `14px`
- font-size: `1rem`
- padding: `10px 16px`
- 見た目高さは約 `40px` 台前半を意図

### 項目間余白

現行の追加ルール:

- `3. テキストを入力する` セクション下: `18px`
- `4. デザインを確定する` の前は詰まりすぎないようにする

## ボタン仕様

### 共通ボタン

- 枠線: `1px solid #141414`
- 背景: `#ffd4d6`
- hover 背景: `#ffc8cb`
- border-radius: `999px`

### 確定ボタン / リセットボタン

対象:

- `このデザインで確定する`
- `すべてリセット`

共通仕様:

- 全商品で中央配置
- `src/ui.js` で以下の専用クラスを付与
  - `footer-actions--confirm`
  - `footer-actions--reset`
- `styles.css` で `justify-items: center` を適用

### ダウンロードボタン

- `download` セクションのボタンは `footer-actions--download`
- 現状は confirm/reset と別クラスで扱う

### `artboard-v1` の小型ボタン

`artboard-v1` ではピンク系ボタンを小さめに見せるため、以下を採用。

- ボタン文字サイズ: `0.7rem`
- ボタン横幅: `70%`

### 回転の `+ / -` ボタン

- 白背景
- 丸ボタン
- `44px x 44px`
- ピンク系ボタン縮小ルールの対象外

## プレビューエリア仕様

### パネル

- 背景: `#fbfcfe`
- 内側 canvas shell 背景: `#eef3f9`
- プレビューエリアは従来より縮小して見せる

### shell

- border-radius: `22px`
- padding: `22px`
- 横幅は右カラムに収まるよう `100%`

## スマホ操作仕様

`artboard-v1` を適用している商品では、スマホ実機での画像操作も共通仕様として扱う。

2026-05-20 時点で、以下を全商品共通の標準操作として実装済み。

### 1本指操作

- プレビュー上の合成画像をドラッグ移動できる

### 2本指操作

- ピンチで拡大縮小できる
- ひねり操作で回転できる

### 既存コントロールとの関係

- スマホ操作を追加しても、既存の拡大率スライダーと角度スライダーは残す
- `印刷範囲に合わせる`
- `初期位置へ戻す`

上記の共通ボタンも従来どおり併用できる。

### 実装上の責務

- 共通ジェスチャー処理は `/Users/hrkhgsn/Desktop/お菓子合成App/src/main.js` で管理する
- 商品 JSON 側に、スマホジェスチャー専用の個別分岐は持たせない
- 商品ごとの差分は、あくまで `canvas`、`labelRect`、`maskRect`、`preview` などの設定値で吸収する

### 確認観点

- 1本指移動で意図せず拡大縮小や回転が始まらないこと
- 2本指操作で、拡大縮小と回転が同時に行えること
- スライダー操作とジェスチャー操作の両方で最終状態が保存されること
- 商品個別の `controls` 構成に依存せず、全商品で同じ操作感を維持すること

## テキスト入力とプレビュー初期文字の分離

一部商品では、入力欄の placeholder とプレビュー上の初期文字を分離する。

そのために `textLayers[]` で以下を使用する。

```json
{
  "placeholder": "4文字程度",
  "defaultText": "ああああ",
  "showDefaultTextInInput": false
}
```

### ルール

- `defaultText`
  - プレビュー初期表示に使う
- `placeholder`
  - 入力欄のガイド文言
- `showDefaultTextInInput: false`
  - 入力欄には `defaultText` を表示しない
  - プレビュー側は `defaultText` を維持する

## 適用済み商品の考え方

2026-05-20 時点では、主に以下の系統へ適用済み。

- カップ麺セミオーダー系
- カップ麺オリジナル系
- ミントタブレット系
- お米ノベルティ系

ただし、商品ごとのレイアウト差が大きい場合は以下を確認すること。

- canvas 比率
- preview.stageAspectRatio
- fitCanvasToShell
- テキスト入力の有無
- `buttonRow` の文言

## 商品追加時の UI 適用手順

1. 近い既存商品を選ぶ
2. `ui.theme` を `artboard-v1` にする
3. `ui.artboard.width = 1512`、`height = 850` を設定する
4. `ui.productHeadingLabel = "商品名"` を設定する
5. テキスト商品なら `placeholder` と `defaultText` の扱いを確認する
6. 必要なら `showDefaultTextInInput: false` を追加する
7. `?product=<id>` でローカル確認する
8. `node --check` と JSON 構文確認を行う

## 共通コード側の責務

### `index.html`

- ヘッダー
- 商品名行
- 操作エリア / プレビューエリアの枠組み

### `styles.css`

- `artboard-v1` の見た目
- 余白、サイズ、線幅、色
- ボタンの中央配置

### `src/ui.js`

- `controls` から UI を動的生成
- confirm / download / reset のセクションにクラスを付与
- `showDefaultTextInInput` を見て入力欄表示を切り替える

### `src/product-loader.js`

- `product.ui` の既定読込

## TODO / unknown

- `artboard-v1` をカップ麺以外へどこまで同じ比率で適用するかは今後調整余地あり
- ボタン縮小率 `70%` は現時点の試作値で、将来見直す可能性がある
- ダウンロードボタンも confirm/reset と完全同一配置にするかは未確定
- `artboard-v1` の正式な採用範囲は、今後のデザインレビューで増減する可能性がある
- スマホジェスチャーの感度や慣性は、実機検証を重ねながら今後微調整する可能性がある
