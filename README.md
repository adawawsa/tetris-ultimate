# Tetris Ultimate

最高レベルのテトリスゲーム体験を提供する、フル機能のWebベースのテトリスゲームです。

🎮 **今すぐプレイ**: https://adawawsa.github.io/tetris-ultimate/

## 🚀 プレイ方法

### オンラインでプレイ（推奨）

ブラウザで以下のURLにアクセスするだけですぐにプレイできます：
https://adawawsa.github.io/tetris-ultimate/

### ローカルで実行

モジュールシステムを使用しているため、ローカルHTTPサーバーが必要です。

#### Python 3を使用する場合:
```bash
cd tetris-ultimate
python3 -m http.server 8000
```
その後、ブラウザで http://localhost:8000 にアクセス

#### Node.jsを使用する場合:
```bash
# http-serverをインストール（初回のみ）
npm install -g http-server

# サーバーを起動
cd tetris-ultimate
http-server -p 8000
```
その後、ブラウザで http://localhost:8000 にアクセス

#### VS Codeを使用する場合:
Live Server拡張機能をインストールして、index.htmlを右クリック→「Open with Live Server」


## 📋 目次

- [機能概要](#-機能概要)
- [詳細なゲーム仕様](#-詳細なゲーム仕様)
- [スコアリングシステム](#-スコアリングシステム)
- [AI対戦システム](#-ai対戦システム)
- [操作方法](#-操作方法)
- [技術仕様](#-技術仕様)

## ✨ 機能概要

### ゲームメカニクス
- **ホールド機能**: 現在のピースを保持
- **ゴーストピース**: 落下位置の予測表示
- **T-Spin検出**: 高度な回転テクニック
- **Super Rotation System (SRS)**: 公式テトリスの回転システム
- **7-bag ランダマイザー**: 公平なピース配布
- **連続コンボシステム**: 連続ライン消去でボーナス
- **パーフェクトクリア**: 全消しボーナス
- **Back-to-Back**: 連続テトリス/T-Spinボーナス

### ビジュアル
- **パーティクルエフェクト**: 美しい視覚効果
- **ネオン風デザイン**: 近未来的なUI
- **スムーズアニメーション**: 60FPS対応
- **レスポンシブデザイン**: あらゆるデバイスに対応

### ゲームモード
- **シングルプレイ**: 一人でハイスコアを目指す
- **マルチプレイヤー**: オンライン対戦（シミュレート版）
- **AI対戦**: 4段階の難易度のAIと対戦
- **トレーニング**: 上達のためのヒント機能付き

### 統計情報
- **PPM** (Pieces Per Minute): 1分あたりのピース数
- **APM** (Attack Per Minute): 1分あたりの攻撃力
- **T-Spins**: T-Spin回数
- **最大コンボ**: 最高連続コンボ数

## 🎯 詳細なゲーム仕様

### テトリミノ（ピース）の種類と色

| 名前 | 形状 | 色 | 特徴 |
|------|------|-------|------|
| **I-ピース** | ████ | シアン | 唯一の4×1形状、テトリス（4ライン消し）に必須 |
| **O-ピース** | ██<br>██ | 黄色 | 2×2の正方形、回転しても形が変わらない |
| **T-ピース** | ███<br>&nbsp;█ | 紫 | T-Spin技術の主役、最も戦略的なピース |
| **S-ピース** | &nbsp;██<br>██ | 緑 | Z字型、隙間を埋めるのに便利 |
| **Z-ピース** | ██<br>&nbsp;██ | 赤 | S字型の反転、Sピースと組み合わせやすい |
| **J-ピース** | █&nbsp;&nbsp;<br>███ | 青 | L字型、角の処理に有効 |
| **L-ピース** | &nbsp;&nbsp;█<br>███ | オレンジ | J字型の反転、多様な配置が可能 |

### Super Rotation System (SRS) 詳細

#### 基本回転
- **右回転（時計回り）**: ↑キー / Xキー
- **左回転（反時計回り）**: Zキー / Ctrlキー
- **180度回転**: Aキー（一部の状況で使用可能）

#### ウォールキック（壁蹴り）システム
ピースが壁や他のブロックに衝突した際、最大5つの代替位置を試行：

```
基本位置 → テスト1 → テスト2 → テスト3 → テスト4 → テスト5
(0,0) → (-1,0) → (-1,+1) → (0,-2) → (-1,-2)
```

**I-ピース専用ウォールキック**:
- より大きな移動範囲（最大2マス）
- 狭い隙間への挿入が可能

### ゲームフィールド仕様

- **フィールドサイズ**: 10×20（幅×高さ）
- **バッファゾーン**: 上部に追加の2行（合計22行）
- **ネクストピース表示**: 5個先まで表示
- **ホールドスロット**: 1個まで保持可能

### 落下速度とレベルシステム

| レベル | 落下速度（秒/行） | ソフトドロップ速度 | ロックディレイ |
|--------|-------------------|-------------------|---------------|
| 1 | 1.000 | 0.050 | 500ms |
| 5 | 0.500 | 0.050 | 500ms |
| 10 | 0.100 | 0.025 | 500ms |
| 15 | 0.050 | 0.025 | 300ms |
| 20 | 0.016 | 0.010 | 300ms |
| 20+ | 0.016 | 0.010 | 250ms |

**レベルアップ条件**:
- 10ライン消去ごとに1レベルアップ
- 特殊消去（T-Spin、テトリス）でボーナス進行

### 特殊テクニック詳細

#### T-Spin判定条件
1. **T-ピースの最終動作が回転**
2. **4隅のうち3箇所以上がブロックで埋まっている**
3. **フロントコーナー（回転後の前面2箇所）のうち2箇所が埋まっている**

**T-Spin種類**:
- **T-Spin Mini**: 条件を部分的に満たす（0.5ライン扱い）
- **T-Spin Single**: 1ライン消去を伴うT-Spin
- **T-Spin Double**: 2ライン消去を伴うT-Spin（最高効率）
- **T-Spin Triple**: 3ライン消去を伴うT-Spin（高難度）

#### Perfect Clear（全消し）
フィールド上のすべてのブロックを消去した状態。
- **ボーナス点**: 1000〜3500点（消去ライン数による）
- **Back-to-Backボーナス**: 適用可能

## 🎮 操作方法

### キーボード操作（デフォルト）

| 動作 | メインキー | 代替キー | 説明 |
|------|-----------|----------|------|
| **左移動** | ← | テンキー4 | ピースを左に1マス移動 |
| **右移動** | → | テンキー6 | ピースを右に1マス移動 |
| **ソフトドロップ** | ↓ | テンキー2 | 通常の20倍速で落下 |
| **ハードドロップ** | Space | テンキー8 | 瞬時に着地 |
| **右回転** | ↑ / X | テンキー1,5,9 | 時計回りに90度回転 |
| **左回転** | Z / Ctrl | テンキー3,7 | 反時計回りに90度回転 |
| **ホールド** | C / Shift | テンキー0 | 現在のピースを保持 |
| **一時停止** | P / Esc | F1 | ゲームを一時停止 |
| **リスタート** | R | - | ゲームをリセット（確認あり） |

### 高度な操作テクニック

#### DAS（Delayed Auto Shift）
- **初期遅延**: 170ms
- **繰り返し速度**: 30ms
- 左右キーを押し続けると、初期遅延後に高速移動

#### ARR（Auto Repeat Rate）
- ピースが壁に到達するまでの最速移動
- プロプレイヤー向けの微調整可能

#### Finesse（最適化操作）
- 各配置に対する最小手数での操作
- 例：中央から右端まで = 右3回（ミス例：右4回+左1回）

### モバイル操作

#### タッチジェスチャー
| ジェスチャー | 動作 | 感度設定 |
|--------------|------|----------|
| **左スワイプ** | 左移動 | 50px以上 |
| **右スワイプ** | 右移動 | 50px以上 |
| **下スワイプ** | ソフトドロップ | 30px以上 |
| **上スワイプ** | 右回転 | 50px以上 |
| **タップ** | ハードドロップ | - |
| **ダブルタップ** | ホールド | 300ms以内 |
| **長押し** | 左回転 | 200ms以上 |

#### 画面上のボタン
- 画面下部に配置された仮想ボタン
- カスタマイズ可能な配置とサイズ
- 透明度調整可能（10%～90%）

### 設定オプション

#### グラフィックス設定
- **パーティクルエフェクト**: ON/OFF - ライン消去時の視覚効果
- **ゴーストピース**: ON/OFF - 落下予測位置の表示
- **グリッド表示**: ON/OFF - フィールドのマス目表示
- **背景アニメーション**: LOW/MEDIUM/HIGH - 背景エフェクトの品質
- **フレームレート**: 30/60/120 FPS - 描画の滑らかさ

#### サウンド設定
- **BGM音量**: 0-100% - 背景音楽の音量
- **効果音音量**: 0-100% - ゲーム効果音の音量
- **ボイス**: ON/OFF - コンボ時などの音声
- **振動フィードバック**: ON/OFF（モバイルのみ）

#### ゲームプレイ設定
- **DAS遅延**: 50-300ms - 自動移動の開始時間
- **ARR速度**: 0-100ms - 自動移動の速度
- **ソフトドロップ速度**: 1x-60x - ソフトドロップの速度倍率
- **ロックディレイ**: 100-1000ms - ピース固定までの猶予時間
- **初期レベル**: 1-15 - ゲーム開始時のレベル

#### アクセシビリティ
- **カラーブラインドモード**: 
  - 標準
  - 赤緑色覚異常対応
  - 青黄色覚異常対応
  - 完全色覚異常対応
- **ハイコントラストモード**: ON/OFF - 視認性向上
- **画面読み上げ**: ON/OFF - スクリーンリーダー対応
- **簡易操作モード**: ON/OFF - 操作を簡略化

## 💯 スコアリングシステム

### 基本スコア

| アクション | 基本点 | レベル乗数 | 説明 |
|-----------|--------|-----------|------|
| **シングル** | 100 | ×レベル | 1ライン消去 |
| **ダブル** | 300 | ×レベル | 2ライン同時消去 |
| **トリプル** | 500 | ×レベル | 3ライン同時消去 |
| **テトリス** | 800 | ×レベル | 4ライン同時消去 |
| **ソフトドロップ** | 1 | ×落下マス数 | 手動での高速落下 |
| **ハードドロップ** | 2 | ×落下マス数 | 即座に着地 |

### T-Spinボーナス

| T-Spin種類 | 基本点 | B2B時 | 特徴 |
|------------|--------|-------|------|
| **T-Spin Mini** | 100 | 150 | ウォールキックを使用した小技 |
| **T-Spin Single** | 800 | 1200 | 高効率な1ライン消去 |
| **T-Spin Double** | 1200 | 1800 | 最も実用的なT-Spin |
| **T-Spin Triple** | 1600 | 2400 | 高難度の3ライン消去 |

### 特殊ボーナス

#### Back-to-Back（B2B）ボーナス
連続して高難度消去を行った場合に適用：
- **対象**: テトリス、T-Spin全般
- **ボーナス**: 基本スコアの1.5倍
- **継続条件**: 通常のライン消去を挟まない

#### コンボシステム
| コンボ数 | ボーナス点 | 累計ボーナス |
|---------|-----------|-------------|
| 1 | 0 | 0 |
| 2 | 50 | 50 |
| 3 | 50 | 100 |
| 4 | 100 | 200 |
| 5 | 100 | 300 |
| 6 | 150 | 450 |
| 7 | 150 | 600 |
| 8 | 200 | 800 |
| 9 | 200 | 1000 |
| 10+ | 250 | 1250+ |

#### Perfect Clear（全消し）
| 消去ライン数 | ボーナス点 | 難易度 |
|-------------|-----------|--------|
| 1ライン | 800 | ★★★☆☆ |
| 2ライン | 1200 | ★★★★☆ |
| 3ライン | 1800 | ★★★★☆ |
| 4ライン | 2000 | ★★☆☆☆ |
| B2B時 | 3500 | ★★★★★ |

### スコア計算例

**例1: レベル5でT-Spin Doubleを成功**
```
基本点: 1200
レベル乗数: ×5
合計: 6000点
```

**例2: B2B テトリス → T-Spin Double コンボ**
```
テトリス: 800 × 1.5 (B2B) × レベル = 1200 × レベル
T-Spin Double: 1200 × 1.5 (B2B) × レベル = 1800 × レベル
コンボボーナス: 50点
```

## 🤖 AI対戦システム

### AI難易度詳細

#### Easy（初級）- 「ビギナーくん」
- **反応速度**: 500ms/手
- **ミス率**: 20%
- **戦略**: 
  - 基本的な高さ最小化
  - 単純なライン消去狙い
  - ホールド未使用
- **特徴**: 初心者でも勝てる、学習に最適

#### Medium（中級）- 「ノーマルさん」
- **反応速度**: 200ms/手
- **ミス率**: 10%
- **戦略**:
  - 穴の最小化を重視
  - ホールドを戦略的に使用
  - 2ライン消去を狙う
- **特徴**: 適度な挑戦、バランスの良い対戦相手

#### Hard（上級）- 「マスター」
- **反応速度**: 100ms/手
- **ミス率**: 5%
- **戦略**:
  - T-Spin積極活用
  - Perfect Clear狙い
  - 3-4ライン消去優先
- **特徴**: 上級者向け、高度な技術が必要

#### Impossible（最強）- 「テトリス神」
- **反応速度**: 50ms/手
- **ミス率**: 0%
- **戦略**:
  - 最適解を常に選択
  - コンボ継続重視
  - T-Spin Triple実行
  - 先読み5手以上
- **特徴**: 理論上最強、打倒はほぼ不可能

### AI評価アルゴリズム

AIは以下の要素を数値化して最適な配置を決定：

```javascript
総合スコア = Σ(
  高さペナルティ × -1.0～-1.2
  + ライン消去ボーナス × 1.0～4.0  
  + 穴ペナルティ × -1.0～-8.0
  + 凸凹ペナルティ × -0.2～-1.0
  + Perfect Clearボーナス × 10.0～20.0
  + T-Spinボーナス × 5.0～8.0
  + コンボ継続ボーナス × 0～2.0
)
```

### 対戦モード機能

#### リアルタイム攻撃システム
- **シングル**: 0ライン送信
- **ダブル**: 1ライン送信
- **トリプル**: 2ライン送信
- **テトリス**: 4ライン送信
- **T-Spin**: +2ボーナスライン
- **Perfect Clear**: 10ライン送信

#### カウンター（相殺）システム
- 受ける攻撃を自分のライン消去で相殺可能
- 余剰分は相手に反撃として送信

## 🎨 ビジュアルエフェクト

### パーティクルシステム
- **ライン消去**: 爆発パーティクル（色はピースに応じて変化）
- **T-Spin成功**: 紫の渦巻きエフェクト
- **Perfect Clear**: 虹色の花火エフェクト
- **レベルアップ**: 画面全体の光波エフェクト
- **コンボ**: 連鎖数に応じた火花エフェクト

### アニメーション
- **ピース落下**: 重力加速度シミュレーション
- **ライン消去**: 0.5秒のフェードアウト
- **ホールド**: 0.2秒の入れ替えアニメーション
- **ゲームオーバー**: グレースケール化 + ぼかし効果

### UI/UXデザイン
- **ネオン風テーマ**: サイバーパンクな雰囲気
- **ダークモード**: 目に優しい配色
- **レスポンシブ**: 画面サイズに自動適応
- **60FPS描画**: 滑らかな動作

## 💻 技術仕様

### 使用技術
- **HTML5 Canvas**: ゲーム描画
- **ES6 Modules**: モジュラー設計
- **CSS3**: アニメーションとスタイリング
- **LocalStorage**: データ永続化
- **Web Audio API**: サウンドシステム
- **RequestAnimationFrame**: 高性能レンダリング

### パフォーマンス最適化
- **オブジェクトプール**: メモリ効率化
- **ダーティフラグ**: 必要な部分のみ再描画
- **Web Worker**: AI計算の非同期処理（予定）

### ブラウザ要件
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- モバイルブラウザ対応

### データ保存仕様
```javascript
// LocalStorageに保存されるデータ
{
  "highScore": 999999,
  "settings": {
    "das": 170,
    "arr": 30,
    "sfxVolume": 70,
    "bgmVolume": 50,
    "ghostPiece": true,
    "particles": true
  },
  "statistics": {
    "totalLines": 12345,
    "totalPieces": 54321,
    "playTime": 3600000,
    "tSpins": 234,
    "perfectClears": 12
  },
  "achievements": ["firstTetris", "firstTSpin", ...]
}

## 🛠️ 開発

### デプロイ

このプロジェクトはGitHub Actionsを使用して自動的にGitHub Pagesにデプロイされます。
mainブランチにプッシュすると自動的に更新されます。

詳細は[DEPLOYMENT.md](DEPLOYMENT.md)を参照してください。

### ディレクトリ構造
```
tetris-ultimate/
├── index.html          # メインHTML
├── src/               # ソースコード
│   ├── game/          # ゲームロジック
│   ├── graphics/      # グラフィックス
│   ├── audio/         # サウンド
│   ├── input/         # 入力管理
│   ├── network/       # ネットワーク
│   ├── ui/            # UI管理
│   ├── managers/      # 各種マネージャー
│   └── ai/            # AI実装
├── styles/            # CSSファイル
└── assets/            # 画像等のアセット
```

### カスタマイズ
ゲームの各種パラメーターは以下のファイルで調整可能：
- `src/game/GameStats.js`: スコアリングシステム
- `src/managers/SettingsManager.js`: デフォルト設定
- `src/ai/AI.js`: AI難易度パラメーター

## 🏆 実績システム（予定）

### 実績カテゴリ

#### 初心者向け実績
| 実績名 | 条件 | ポイント |
|--------|------|----------|
| **First Drop** | 初めてピースを配置 | 10 |
| **Line Clear** | 初めてラインを消去 | 20 |
| **First Tetris** | 初めて4ライン同時消去 | 50 |
| **Speed Demon** | レベル10到達 | 100 |

#### 中級者向け実績
| 実績名 | 条件 | ポイント |
|--------|------|----------|
| **T-Spin Master** | T-Spin 100回達成 | 200 |
| **Combo King** | 10コンボ達成 | 150 |
| **Perfect Player** | Perfect Clear 10回 | 300 |
| **Million Points** | 100万点突破 | 500 |

#### 上級者向け実績
| 実績名 | 条件 | ポイント |
|--------|------|----------|
| **T-Spin Triple** | T-Spin Tripleを成功 | 400 |
| **20 Combo** | 20コンボ達成 | 600 |
| **Speed Master** | レベル20でテトリス | 800 |
| **AI Slayer** | Impossible AIに勝利 | 1000 |

#### 秘密の実績
| 実績名 | 条件 | ポイント |
|--------|------|----------|
| **All Clear Start** | 開幕Perfect Clear | ??? |
| **No Hold Challenge** | ホールド未使用で10万点 | ??? |
| **Minimalist** | I-ピースのみで1000ライン | ??? |
| **True Master** | 全実績コンプリート | ??? |

## 🎯 上達のためのヒント

### 初心者向け
1. **フラットに積む**: 凸凹を避けて平らに積むことが基本
2. **端を空ける**: I-ピース用に片端を空けておく
3. **ホールドを活用**: 困ったらホールドで時間を稼ぐ
4. **ゴーストピースを見る**: 落下位置を確認してミスを防ぐ

### 中級者向け
1. **T-Spinセットアップ**: T字の形を意識して積む
2. **3-6-9スタック**: 高さを3-6-9で管理
3. **スキミング**: 高く積んで一気に消す技術
4. **ファーストホールド**: 開幕でI/T/Sをホールド

### 上級者向け
1. **PCO（Perfect Clear Opener）**: 開幕パフェを狙う定石
2. **LST積み**: Left Side Tripleの略、効率的な積み方
3. **DT砲（Donation Triple）**: 対戦での攻撃技術
4. **4-wide**: 4列空けの高火力戦術（高リスク）

### フィネス（最適化操作）の基本
```
中央からの最適移動:
左端: 左左左（3手）
左2: 左左（2手）  
左1: 左（1手）
中央: -（0手）
右1: 右（1手）
右2: 右右（2手）
右端: 右右右（3手）

※ 左左左左→左は5手でミス（フィネスエラー）
```

## 🌐 マルチプレイヤーモード詳細

### 対戦ルール

#### ターゲッティングシステム
- **ランダム**: ランダムな相手を攻撃
- **バッジ**: 最も多くKOしている人を狙う
- **カウンター**: 自分を狙っている人に反撃
- **とどめ**: HPが少ない相手を狙う

#### ガーベージライン
- **グレー**: 通常の攻撃ライン
- **レッド**: 反撃不可の強力な攻撃
- **ホワイト**: 消去で攻撃力UP

### 部屋設定オプション
- **最大人数**: 2-99人
- **制限時間**: 無制限/3分/5分/10分
- **開始レベル**: 1-15
- **アイテム**: ON/OFF（予定）
- **観戦モード**: 許可/禁止

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### ゲームが動かない
1. ブラウザが対応しているか確認（Chrome/Firefox/Safari/Edge）
2. JavaScriptが有効になっているか確認
3. キャッシュをクリアして再読み込み（Ctrl+F5）

#### 操作が効かない
1. 別のアプリケーションがキーを占有していないか確認
2. 入力メソッド（IME）をオフにする
3. キーバインド設定を確認・リセット

#### 音が出ない
1. ブラウザの音声許可を確認
2. デバイスの音量設定を確認
3. 設定画面でBGM/SEの音量を確認

#### セーブデータが消えた
1. プライベートブラウジングモードではないか確認
2. ブラウザのLocalStorage容量を確認
3. 別のブラウザ/プロファイルではないか確認

## 📱 モバイル最適化

### タッチ操作の詳細設定
- **スワイプ感度**: 10px-200px（調整可能）
- **長押し判定**: 100ms-500ms（調整可能）
- **バイブレーション**: 弱/中/強/OFF
- **ボタンサイズ**: 小/中/大/特大
- **ボタン配置**: プリセット6種類+カスタム

### パフォーマンス設定（モバイル）
- **描画品質**: 低/中/高
- **エフェクト**: 最小/標準/最大
- **背景**: 静止/アニメーション
- **省電力モード**: ON/OFF

## 🤝 コントリビューション

プルリクエストや問題報告を歓迎します！
新機能の提案やバグ報告は[Issues](https://github.com/adawawsa/tetris-ultimate/issues)でお願いします。

## 📄 ライセンス

このプロジェクトはMITライセンスで公開されています。

---

🎮 **今すぐプレイ**: https://adawawsa.github.io/tetris-ultimate/