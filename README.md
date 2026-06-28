# 📊 Ads Performance Dashboard

Google Ads・Meta Ads・TikTok Adsの広告パフォーマンスを可視化するダッシュボードです。

## 🔗 デモ

https://nox-txt.github.io/ads-dashboard/

## 📌 制作背景

前職のSNS広告運用経験から、複数媒体のパフォーマンスを一元管理・比較できるツールの必要性を感じ制作しました。ROAS・CPA・CV数などのKPIをリアルタイムで比較・分析できる構成を意識しています。

## 🛠 使用技術

| 技術 | 用途 |
|------|------|
| HTML / CSS | UI構築・レイアウト |
| JavaScript（Vanilla JS） | データ処理・グラフ描画 |
| Chart.js | グラフ可視化 |
| PapaParse | CSVの読み込み・パース |
| SQLite | データの集計・検証 |
| GitHub Pages | デプロイ |

## 📊 主な機能

- **KPIカード**：総広告費・平均ROAS・総CV数・平均CPAをリアルタイム表示
- **プラットフォーム別ROAS比較**：Google・Meta・TikTokの費用対効果を棒グラフで比較
- **月別広告費トレンド**：広告費の推移を折れ線グラフで可視化
- **広告費シェア**：プラットフォーム別の予算配分を円グラフで表示
- **キャンペーンタイプ別ROAS**：Search・Display・Shopping・Videoの効率を比較
- **フィルター機能**：プラットフォームで絞り込んでグラフ・KPIを動的に更新
- **データテーブル**：数値一覧をソート機能付きで表示
- **ダークモード切替**：ライト・ダークモードの切り替えに対応
- **レスポンシブ対応**：スマホ・タブレットでも見やすいレイアウト

## 📁 ファイル構成

ads-dashboard/

├── index.html                        # メインHTML

├── style.css                         # スタイルシート

├── main.js                           # データ処理・グラフ描画

├── global_ads_performance_dataset.csv # 広告データ（Kaggle）

└── ads.db                            # SQLiteデータベース

## 📈 データについて

Kaggleで公開されている「Global Ads Performance Dataset」を使用しています。
Google Ads・Meta Ads・TikTok Adsのキャンペーンレベルデータ（1,800件）が含まれています。

- [データセットURL](https://www.kaggle.com/datasets)

## 💡 工夫した点

- CSVを1回だけ読み込んで全グラフに使い回すことでパフォーマンスを最適化
- フィルター切替時にグラフを破棄・再生成することでアニメーションを維持
- マーケター視点でKPIの優先順位を設計（ROAS・CPA中心の構成）
