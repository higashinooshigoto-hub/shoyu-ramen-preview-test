# Product Simulation Spec

## 全体の目的

このアプリは、商品ごとの印刷 / 合成イメージをブラウザ上で確認するための
「商品シミュレーション」基盤である。

現状のシミュレーション対象は価格ではなく、以下の視覚的調整である。

- 画像の配置
- 画像の拡大縮小
- 画像の回転
- テキスト入力
- 商品ごとの印刷範囲 / クリッピング範囲の確認
- 完成イメージの書き出し

## ユーザーが入力する項目

商品によって差はあるが、基本的に以下を入力する。

- アップロード画像
- 画像の拡大率
- 画像の回転角度
- 画像の位置
- テキスト 0 行以上
- ダウンロード形式

## 商品ごとに変わる項目

- 商品名、タイトル、説明文
- ベース画像
- マスク画像
- 境界ガイド画像
- キャンバスサイズ
- 印刷範囲座標
- クリップ形状
- テキスト入力数
- テキスト位置
- テキストの fontFamily / fontSize / strokeStyle / lineWidth
- UI の見出しや注意文
- プレビュー枠のアスペクト比

## 商品ごとに共通の項目

- `id`
- `name`
- `title`
- `eyebrow`
- `lead`
- `canvas`
- `labelRect`
- `overlayStyle`
- `baseLayerOrder`
- `preview`
- `export`
- `controls`

## 計算結果として表示する項目

現状のリポジトリでは、一般的な価格計算結果は表示していない。
実装済みの表示結果は以下。

- プレビューキャンバス上の合成結果
- テキスト反映後の見た目
- 確定状態のメッセージ
- ZIP ダウンロード用の完成画像

### 未実装 / 未確認

- 価格
- 料率
- 手数料
- 納期 / 期間
- 個数別見積もり

上記はこのリポジトリ内では未確認のため、必要なら別途 TODO として設計する。

## 入力値のバリデーションルール

現在確認できる代表ルールは以下。

- アップロード画像の拡張子 / MIME 制限
- 拡大率スライダーの `min` / `max` / `step`
- 回転スライダーの `min` / `max` / `step`
- テキストごとの `maxLength`
- テキストごとの `halfWidthMaxLength`
- IME 入力中の確定タイミングを考慮した制限

バリデーションは主に

- `products/*.json` にある設定値
- `src/ui.js`
- `src/main.js`

で実現されている。

## 表示文言・注意書きの扱い

表示文言は原則として商品 JSON 側で持つ。

主な格納先:

- `title`
- `eyebrow`
- `lead`
- `preview.note`
- `controls[].text`
- `controls[].label`
- `controls[].heading`
- `controls[].description`
- `textLayers[].label`
- `textLayers[].placeholder`

共通 UI 側に商品固有文言を直書きしないこと。

## 計算ロジックの責務分担

### `products/*.json`

- 商品固有値
- 表示文言
- 画像座標
- マスクサイズ
- テキスト座標
- UI 項目構成

### `src/product-loader.js`

- 商品 JSON の読込
- URL パラメータ解決
- 既定値の注入

### `src/ui.js`

- `controls` から操作 UI を生成
- `textLayers` からテキスト欄を生成

### `src/main.js`

- 状態管理
- 画像読込
- fit / reset / text 入力反映
- localStorage 保存 / 復元

### `src/renderer.js`

- ベース画像描画
- マスク適用
- ガイド描画
- テキスト描画
- プレビュー fill 描画

### `src/exporter.js`

- 書き出しと ZIP 生成

## 商品データと UI の責務分担

### 商品データに持たせるもの

- 何を表示するか
- どこに表示するか
- 何個入力させるか
- どの画像で切り抜くか
- どの順序で操作させるか

### UI 側が持つもの

- 各 control type の描画方法
- スライダーやボタンの共通イベント処理
- テキスト入力欄の生成方法
- 確定 / ダウンロード UI の共通挙動

## 商品追加時のチェックリスト

1. 近い既存商品 JSON を選ぶ
2. `assets/` に必要画像を追加する
3. `products/<id>.json` を作成する
4. `products/index.json` に登録する
5. `labelRect` と `maskRect` が一致しているか確認する
6. `clipShape` が必要か確認する
7. `baseLayerOrder` が `foreground` か `background` か確認する
8. `preview.printAreaBackground` が仕様に合うか確認する
9. `textLayers` の座標、色、縁取り、文字数制限を確認する
10. `controls` が正しい順序か確認する
11. `?product=<id>` でローカル表示確認する
12. `node --check` など使える確認を行う
13. 不明点は TODO として docs に残す

## TODO / unknown として扱うべきもの

- 正式な商品カテゴリ命名規則
- 価格や料率の将来仕様
- 共有 URL を全商品でフォルダ型に統一するかどうか
- 旧ファイル群 (`app.js`, `product-templates.js`, 一部 preview HTML) の最終的な扱い
