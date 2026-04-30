# Codex Handoff

## アプリの目的

このリポジトリは、ノベルティ商品の注文ページなどに埋め込む
「仕上がり合成イメージ作成ツール」の実装を管理する。

主な用途は以下。

- ユーザーが画像をアップロードする
- 商品ごとの印刷範囲に合わせて画像を移動 / 拡大 / 回転する
- 必要な商品ではテキストを入力する
- 完成イメージと元画像を ZIP で書き出す

現状は価格計算や料率計算のシミュレーターではなく、
商品ごとの画像合成プレビューアプリである。

## 現在の実装概要

- 入口は `index.html`
- 商品切り替えは `?product=<id>` の URL パラメータで行う
- 商品仕様の主な source of truth は `products/*.json`
- 共通ロジックは `src/*.js`
- 商品ごとの base / mask / boundary 画像は `assets/`
- 一部の商品は `/<product-slug>/index.html` のような共有用エイリアス URL を持つ

商品ごとの差分は主に JSON 側で表現されている。
共通コードは、読み込み・UI 生成・描画・出力・状態保持に分かれている。

## 主要ディレクトリ構成

```text
/Users/hrkhgsn/Desktop/お菓子合成App
├── index.html
├── products/
│   ├── index.json
│   ├── _template.json
│   └── *.json
├── src/
│   ├── main.js
│   ├── product-loader.js
│   ├── ui.js
│   ├── renderer.js
│   ├── exporter.js
│   ├── state.js
│   └── image-utils.js
├── assets/
│   └── *.png
├── docs/
│   ├── codex-handoff.md
│   └── product-simulation-spec.md
└── AGENTS.md
```

## 商品シミュレーションの共通フロー

1. `src/product-loader.js` が `products/index.json` を読み込む
2. URL パラメータ `?product=` から対象商品 ID を解決する
3. 対応する `products/<id>.json` を読み込む
4. `src/ui.js` が `product.controls` と `product.textLayers` から操作 UI を動的生成する
5. `src/main.js` がアップロード画像、テキスト、確定状態、保存状態を管理する
6. `src/renderer.js` が mask / clipShape / text / preview fill / boundary を描画する
7. `src/exporter.js` が完成画像と元画像を ZIP 書き出しする

## 商品追加時に見るべきファイル

最初に見る優先順は以下。

1. `/Users/hrkhgsn/Desktop/お菓子合成App/AGENTS.md`
2. `/Users/hrkhgsn/Desktop/お菓子合成App/docs/codex-handoff.md`
3. `/Users/hrkhgsn/Desktop/お菓子合成App/docs/product-simulation-spec.md`
4. `/Users/hrkhgsn/Desktop/お菓子合成App/products/_template.json`
5. `/Users/hrkhgsn/Desktop/お菓子合成App/products/index.json`
6. `/Users/hrkhgsn/Desktop/お菓子合成App/src/product-loader.js`
7. `/Users/hrkhgsn/Desktop/お菓子合成App/src/ui.js`
8. `/Users/hrkhgsn/Desktop/お菓子合成App/src/renderer.js`
9. `/Users/hrkhgsn/Desktop/お菓子合成App/src/main.js`
10. 追加対象に近い既存商品の `products/*.json`

## 商品追加時の手順

1. もっとも近い既存商品の `products/*.json` を探す
2. `assets/` に base / mask / boundary など必要素材を追加する
3. `products/<id>.json` を作成する
4. `products/index.json` に商品登録を追加する
5. 必要なら共有 URL 用の `/<slug>/index.html` を追加する
6. ローカルで `?product=<id>` を開いて確認する
7. 必要最小限の共通コード変更だけ行う
8. `node --check` など利用可能な確認を行う
9. Git 反映はユーザーの明示指示があるまで保留する

## 商品データの管理方針

- 商品差分は原則 `products/*.json` で持つ
- 共通フィールドの意味は `src/product-schema.js` で明文化する
- `products/_template.json` を最初のひな型として使う
- 商品固有の座標、テキスト位置、 maskRect などは JSON に置く
- 画像名、文言、入力欄の構成も JSON に置く
- 不明な条件は勝手に埋めず `TODO` / `unknown` として記録する

## 計算ロジックの管理方針

このリポジトリに価格計算・料率計算・手数料計算・期間計算の実装は現時点で確認できていない。

現在の「計算ロジック」は主に以下。

- 画像の fit / reset / scale / rotation
- text layer ごとの文字数制限
- mask / clipShape によるクリッピング
- preview stage の表示制御
- ZIP 出力

将来、金額計算などのシミュレーション要素を足す場合は、
商品 JSON に条件値を分離し、計算本体は `src/` の共通関数へ寄せること。

## UI コンポーネントの共通化方針

- 操作 UI は `product.controls` から動的生成する
- テキスト入力欄は `product.textLayers` から動的生成する
- 商品固有の文言・ステップ数・入力欄数は JSON 差分で表現する
- 商品固有ロジックを `src/ui.js` や `src/main.js` に直接増やしすぎない

## 既存商品の一覧

2026-04-30 時点で `products/index.json` に登録されている商品は 17 件。

### ミントタブレット系

- `mint-tablet-case`

### カップ麺 セミオーダー系

- `shoyu-ramen`
- `miso-ramen`
- `tonkotsu-ramen`
- `tonkimchi-ramen`
- `wakame-ramen`
- `mini-wakame-ramen`

### カップ麺 オリジナル系

- `shoyu-ramen-original`
- `miso-ramen-original`
- `tonkotsu-ramen-original`
- `tonkimchi-ramen-original`
- `wakame-ramen-original`
- `mini-wakame-ramen-original`
- `toridaki-udon-original`
- `koebi-soba-original`

### お米ノベルティ系

- `rice-2go-original`
- `rice-1go-original`

## 現時点で不明な点

- 価格 / 料率 / 手数料 / 期間に関する仕様は、このリポジトリからは確認できない
- 商品カテゴリ名の正式名称ルールは未整理
- 一部 assets は過去の試行錯誤や旧構成の名残があり、参照中かどうかの判別が難しい
- `README.md` は現状の JSON 駆動構成を十分に反映していない
- 一部商品の共有 URL がフォルダ型、 一部が `?product=` のみで混在している

## 今後の改善候補

- `products/index.json` にカテゴリ、公開フラグ、共有 URL 情報を追加する
- `src/product-schema.js` を基準に JSON 検証スクリプトを作る
- 旧構成ファイルと現行構成ファイルの役割を整理する
- `README.md` を現行構成に合わせて更新する
- 共有 URL 方針を `?product=` 方式かフォルダエイリアス方式かで整理する
- 商品一覧ドキュメントを `docs/` に追加する

## 次の Codex チャットで最初に読むべきファイル

- `/Users/hrkhgsn/Desktop/お菓子合成App/AGENTS.md`
- `/Users/hrkhgsn/Desktop/お菓子合成App/docs/codex-handoff.md`
- `/Users/hrkhgsn/Desktop/お菓子合成App/docs/product-simulation-spec.md`
- `/Users/hrkhgsn/Desktop/お菓子合成App/src/product-schema.js`
- `/Users/hrkhgsn/Desktop/お菓子合成App/products/_template.json`

## 次回の Codex チャット開始用プロンプト

```text
まず /Users/hrkhgsn/Desktop/お菓子合成App/AGENTS.md、
/Users/hrkhgsn/Desktop/お菓子合成App/docs/codex-handoff.md、
/Users/hrkhgsn/Desktop/お菓子合成App/docs/product-simulation-spec.md、
/Users/hrkhgsn/Desktop/お菓子合成App/src/product-schema.js
を読んで、現在の構造と運用ルールを把握してください。

このリポジトリでは products/*.json を正として商品差分を管理しています。
既存動作を壊さず、まずは近い既存商品を再利用する方針で進めてください。
不明な仕様は推測で確定せず、TODO または unknown として残してください。
```
