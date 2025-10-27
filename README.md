# CustardWeb - Bird Team Adaptation

軽量な Nuxt3 ベースの静的サイトテンプレートです。CustardWeb を参考にして鳥人間チーム向け指導AIを作成します。

## プロジェクト概要

鳥人間チームの技術指導をAIで支援するシステム。指導者の知識を形式知化し、Webから対話形式でアクセス可能にする。

### 背景と目的

- 指導者の高齢化による知識喪失リスクの回避
- 散在したドキュメントの集約
- 24時間利用可能なAI指導環境の構築

### ゴール

- 暗黙知の形式知化とAI知識ベース構築
- 根拠に基づいたAI回答の提供
- 新メンバーの効率的な学習支援
- GitHubベースの一元管理

## 技術スタック

- **Webフロントエンド**: Vue.js (Nuxt.js), TypeScript
- **Web UIフレームワーク**: Vuetify 3 (ダークテーマ)
- **Webデプロイ**: GitHub Pages (静的生成)
- **ブラウザ内DB**: IndexedDB (Dexie.js) - 会話履歴保存
- **ブラウザ内RAG**: シンプル実装（コサイン類似度検索、embeddings永続化）
- **AIモデル**: Google Gemini API (gemini-2.0-flash-exp)
- **API統合**: クライアントサイド直接呼び出し（GitHub Pages対応）
- **知識・コード管理**: Git / GitHub

## セットアップ

### 1. APIキーの設定（ブラウザ内）

**⚠️ 重要:** このアプリはGitHub Pagesで動作するため、APIキーはブラウザのlocalStorageに保存されます。

**APIキーの取得方法:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. "Create API Key" をクリックして新しいキーを生成
3. アプリを開いて右下の⚙️アイコン → 「API設定」タブでキーを入力

**セキュリティ注意:**
- 共有PCでは使用後にAPIキーをクリアしてください
- APIキーは個人使用のみにしてください
- 公開リポジトリにAPIキーをコミットしないでください

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 4. GitHub Pagesへのデプロイ

**初回セットアップ:**

1. GitHubリポジトリの設定
   - Settings → Pages
   - Source: "GitHub Actions" を選択

2. リポジトリ名とbaseURLの設定
   - `nuxt.config.ts` の `app.baseURL` を確認
   - デフォルト: `/custardweb_app/` (リポジトリ名と一致させる)

**デプロイ方法:**

```bash
# mainブランチにpushすると自動デプロイ
git add .
git commit -m "Update content"
git push origin main
```

GitHub Actionsが自動的にビルド・デプロイします。
デプロイ後、`https://<username>.github.io/custardweb_app/` でアクセス可能。

**ローカルで静的ビルドを確認:**

```bash
npm run generate
```

`.output/public` フォルダがデプロイ可能な静的ファイルになります。

## 使い方

1. アプリを開いて右下の⚙️アイコンをクリック
2. 「API設定」タブでGemini APIキーを入力
3. ドキュメント（PDF/TXT）をアップロード（任意）
4. メッセージを入力して送信
5. AIが回答を生成（RAG検索結果も利用）

## 主な機能

### 実装済み

- ✅ **ダークテーマUI**: Vuetifyベースのモダンなデザイン
- ✅ **会話管理**: IndexedDBで永続化、複数会話の管理
- ✅ **ブラウザ内RAG**: ドキュメント埋め込みと類似検索
- ✅ **Gemini API統合**: クライアントサイド直接呼び出し
- ✅ **ストリーミング応答**: リアルタイムで段落ごとに表示
- ✅ **設定画面**: RAG設定、API設定、会話管理
- ✅ **マークダウンレンダリング**: コードブロック対応
- ✅ **エクスポート/インポート**: JSON形式で会話データ保存・復元
- ✅ **ゴミ箱機能**: 削除した会話の復元・完全削除
- ✅ **GitHub Pages対応**: 静的サイトとして動作

### 主要コンポーネント

#### RAG（検索拡張生成）
- `src/rag/rag.ts`: ブラウザ内RAG実装
- `src/rag/documents.ts`: サンプルドキュメント
- Gemini Embedding API (text-embedding-004) を使用
- IndexedDBに埋め込みベクトルを永続化

#### API
- `src/api/gemini.ts`: Gemini API クライアント（ブラウザ直接呼び出し）
- ストリーミング応答対応
- localStorageからAPIキーを取得

#### データベース
- `src/db/index.ts`: Dexie (IndexedDB) 設定
- 会話履歴、メッセージ、RAGドキュメントを保存
- 論理削除機能（ゴミ箱）

#### コンポーネント
- `pages/index.vue`: メインチャット画面
- `components/ConversationSidebar.vue`: 会話一覧・ゴミ箱
- `components/SettingsDialog.vue`: 設定ダイアログ（API設定、RAG設定等）

## セキュリティとプライバシー

### APIキー管理
- **ブラウザ保存**: APIキーはlocalStorageに保存されます
- **個人使用**: 共有環境では使用後にクリアしてください
- **通信**: すべてHTTPS経由でGoogle APIと直接通信

### データプライバシー
- **ローカル保存**: 会話履歴はブラウザ内IndexedDBに保存
- **サーバー送信なし**: すべてのデータはブラウザ内で処理
- **Google APIのみ**: AIクエリはGoogle Gemini APIにのみ送信

### 推奨事項
- 個人用デバイスでの使用を推奨
- 共有PCでは使用後に設定をクリア
- 機密情報を含む会話は定期的に削除

## トラブルシューティング

### APIキーが設定されていないエラー

アプリ画面で右下の⚙️アイコン → 「API設定」タブを開いて、APIキーを入力してください。

### RAGドキュメントが読み込まれない

設定画面 → 「RAG設定」タブで「ドキュメントを再インデックス」ボタンをクリックしてください。

### GitHub Pagesでデプロイエラー

- `nuxt.config.ts` の `app.baseURL` がリポジトリ名と一致しているか確認
- GitHub リポジトリ設定で Pages の Source が "GitHub Actions" になっているか確認

## 開発ガイド

### プロジェクト構造

```
custardweb_app/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions自動デプロイ
├── components/
│   ├── ConversationSidebar.vue # 会話一覧・ゴミ箱
│   └── SettingsDialog.vue      # 設定ダイアログ
├── pages/
│   └── index.vue               # メインチャット画面
├── src/
│   ├── api/
│   │   └── gemini.ts           # Gemini APIクライアント
│   ├── db/
│   │   └── index.ts            # IndexedDB設定
│   └── rag/
│       ├── rag.ts              # ブラウザ内RAG実装
│       └── documents.ts        # サンプルドキュメント
├── nuxt.config.ts              # Nuxt設定
└── package.json
```

### 技術的な詳細

- **Nuxt3**: SSR無効、静的サイト生成モード
- **GoogleGenerativeAI SDK**: クライアントサイドで直接使用（ブラウザ対応）
- **モデル**: gemini-2.0-flash-exp（生成）、text-embedding-004（埋め込み）
- **GitHub Pages**: GitHub Actions workflow自動デプロイ

### ビルド・デプロイ

```bash
# ローカルビルド
npm run generate

# 出力確認
cd .output/public
npx serve

# GitHub Pagesへのデプロイ（自動）
git push origin main
```

参考リポジトリ: [CustardWeb](https://github.com/nyanko3141592/CustardWeb)

## 非公開リポジトリ取り込み運用手順

### 概要
GitHub Actionsを使用して非公開リポジトリからドキュメントを自動取得し、RAGインデックスを生成してGitHub Pagesにデプロイします。

### 前提条件
- GitHubリポジトリが作成済み
- GitHub Pagesが有効化済み
- 対象リポジトリへのアクセス権限があるPersonal Access Token (PAT)

### セットアップ手順

#### 1. Personal Access Tokenの作成
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. スコープ設定:
   - `repo` (Full control of private repositories) - 必須
   - `read:org` (Read org and team membership) - 任意
4. Tokenを生成して安全に保存

#### 2. GitHub Secretsの設定
1. **ソースリポジトリ**（このアプリのコードがあるリポジトリ） → Settings → Secrets and variables → Actions
2. "New repository secret" で以下のSecretsを追加:
   - `GITHUB_PAT`: 上記で作成したPAT（private docsリポジトリへのアクセス用）
   - `GEMINI_API_KEY`: Google AI Studioで取得したAPIキー（RAGインデックス生成用）

#### 3. アプリの設定
1. アプリを開いて右下の⚙️アイコン → 「詳細設定」タブ
2. 「ソースリポジトリ URL」にこのアプリのGitHubリポジトリURLを入力
3. 「GitHub Personal Access Token (PAT)」に作成したPATを入力
4. 「GitHub リポジトリ URL」に学習したい資料リポジトリのURLを入力
1. リポジトリ → Actions → "Fetch Private Repo and Deploy"
2. "Run workflow" をクリック
3. 対象リポジトリURLを入力（例: `https://github.com/owner/repo`）
4. "Run workflow" を実行

### 動作フロー
1. **リポジトリ取得**: PATを使用してGitHub APIでファイル一覧を取得
2. **ファイルダウンロード**: テキストファイル（.md, .txt, .js, .ts等）をダウンロード
3. **インデックス生成**: Gemini APIでembeddingsを生成し、RAGインデックスを作成
4. **静的サイト生成**: Nuxtでサイトをビルド（インデックスを同梱）
5. **Pagesデプロイ**: 生成されたサイトをGitHub Pagesにデプロイ

### セキュリティ対策
- **PAT管理**: GitHub Secretsで安全に管理、コードにハードコーディングしない
- **アクセス制限**: 最小限のスコープ（repo権限）のみ付与
- **定期更新**: PATは定期的に更新することを推奨
- **監査**: Actionsログでアクセス履歴を確認可能

### 制限事項
- 最大50ファイルまで処理（パフォーマンス考慮）
- 対応ファイル形式: .md, .txt, .js, .ts, .vue, .json, .yaml, .yml, .toml, .ini, .cfg, .conf
- ファイルサイズ: 非常に大きなファイルは処理をスキップ

### トラブルシューティング
- **ワークフロー失敗**: Actionsログを確認、PATの権限と有効性をチェック
- **インデックス未生成**: GEMINI_API_KEYが正しく設定されているか確認
- **Pages未更新**: ワークフローが完了するまで待機（数分かかる場合あり）

### ローカル検証
非公開リポジトリの動作確認をローカルで行う場合:
1. 設定画面の詳細設定タブでPATを入力
2. GitHubリポジトリURLを入力
3. "GitHubから資料を取得" ボタンをクリック

※ 本番環境ではPATをブラウザに保存せず、GitHub Actionsを使用することを推奨

## ライセンス

MIT License


PowerShell (例):

```powershell
Set-Location -Path 'c:\Users\ryota\py\Sasaki_AI\custardweb_app'
npm install
npm run dev
```

または、UNIX 系の環境（WSL や macOS / Linux）では通常 `&&` を使えますが、README に記載する際は OS ごとに明示することをおすすめします。

動作確認（会話の永続化）:

1. アプリを起動（`npm run dev`）
2. ブラウザでトップページを開き、APIキー入力は任意（ローカルストレージに保存されます）
3. Chat にメッセージを入れて送信すると、画面にメッセージとプレースホルダ応答が出ます
4. ページをリロードすると、過去の会話が IndexedDB (Dexie) から読み込まれて表示されます

（注）ブラウザの DevTools → Application → IndexedDB でデータを確認できます。
