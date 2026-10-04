# jev-insight-app

展示会ブースで、担当者と来場者の会話をスマホで録音し、来場者の会社・団体が抱える「課題」を見つけるための Web アプリです。
会話の文字起こしを [TypeSafe AI](https://typesafe.ai/) の **Jev** で発話ごとに判定し、課題に関係する発言だけを残します。会話の終了時には、ローカルの LLM が来場者向けのまとめと、ブース担当者向けのリードデータを作ります。

## 主な機能

- **来場者の登録**: 来場者バッジの QR コードをスマホのカメラで読み取ります。読み取った内容は URL 全体をそのまま保存します。QR があれば、会社名・氏名は省略できます。
- **録音と判定**: 8 秒ごとに音声を送り、文字起こしをすぐ画面に表示します。Jev の判定が終わると、課題カードか「破棄」に切り替わります。
  - 次の発言は保存しません: あいさつ・雑談、出展者側の質問、画面の質問を読み上げた声、短すぎる断片
  - 課題カードには、Jev の課題スコア（0〜1）と深刻度（1〜5）を数値で表示します
- **深掘りの支援**: まだ聞けていない情報（規模・予算・時期・決裁者など）を Jev が選び、「次に聞いてみる」質問として表示します。あわせて「課題の具体度」（0〜3）をメーターで表示します。
- **来場者向けのまとめ**: 会話を終了すると、次の内容を来場者本人に見せます。
  - 本人が言葉にしていなかった「背景にある課題」
  - お話のテーマの比重
  - おすすめの業務改善と、その最初の一歩
- **担当者向けのリード**: 商談見込み（A/B/C）、次のアクション、アポイント依頼文を保存します。一覧からリードページを開くか、CSV で出力して確認します。
- **来場者アンケート**: 来場者が自分のスマホで開き、来場者バッジの QR を読み取ってから設問に答えます。回答すると「コーヒー引換チケット」が表示されます。
  - チケットは 1 バッジにつき 1 枚です。同じ QR で答え直しても、最初の回答と同じチケットが出ます。
  - コーヒーを渡すときに、担当者が来場者の画面のボタンを長押しして「お渡し済み」にします。
  - アンケートの入口の QR は、担当者用の「課題メモ」「アンケート回答」のどちらの画面からも、「アンケートのQRを表示」で出せます。開いているホストの `/survey` を指すので、公開用の URL で開いた端末で表示してください。
  - 設問は `lib/survey.ts` にあります（いまはサンプルです）。
  - 回答は担当者用の一覧と CSV で確認できます。同じ QR の課題メモがあれば、相互にたどれます。

## 構成

```
スマホ（ブラウザ）
   │ 8秒ごとの音声（webm / mp4）
   ▼
Next.js（App Router, Node.js）
   ├─ whisper.cpp（whisper-server）      文字起こし
   ├─ TypeSafe AI Jev（System One API）   発話の判定・深掘り質問・商談見込み
   ├─ gemma-4-12b（llama-server）        終了時のまとめ（来場者向け／担当者向けを並列で作成）
   └─ SQLite（Drizzle ORM）              data/insight.db
```

Jev は文章を生成せず、`noul`（はい／いいえの確率）・`choice`（選択肢）・`score`（段階評価）を返します。
そのため、課題の抽出は「発話ごとに判定し、関係するものだけを残す」方式にしています。文章の生成は gemma が担当します。

| 使っているところ | Jev への質問 |
|---|---|
| 発話ごと | 課題に関係あるか / 来場者自身の話か / テーマ / 情報の種類 / 深刻度 / 予算・時期・決裁者への言及 |
| 会話中 | 次に確認すべき不足情報 / 商談見込み（課題の具体度） |
| 終了時 | 商談見込み（A/B/C の判定） |

質問の定義は `lib/jev-questions.ts` にあります。

## 必要なもの

- Node.js 22 以降
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) の `whisper-server` と、日本語に対応したモデル（`ggml-large-v3-turbo` を推奨）
- ffmpeg（whisper-server の `--convert` オプションで使います）
- OpenAI 互換 API で使える LLM サーバ（[llama.cpp](https://github.com/ggml-org/llama.cpp) の `llama-server` で gemma-4-12b を動かすことを想定しています）
- TypeSafe AI の API キー

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # TYPESAFE_API_KEY を設定する
```

| 環境変数 | 既定値 | 説明 |
|---|---|---|
| `TYPESAFE_API_KEY` | （必須） | TypeSafe AI の API キー |
| `TYPESAFE_MODEL` | `jev-latest` | Jev のモデル名 |
| `WHISPER_URL` | `http://127.0.0.1:8090` | whisper-server の URL |
| `GEMMA_URL` | `http://127.0.0.1:8080` | llama-server の URL |
| `RELEVANCE_THRESHOLD` | `0.5` | この値以上の発言だけを課題として保存します |
| `DATABASE_PATH` | `./data/insight.db` | SQLite のファイルの場所 |

whisper-server と llama-server を起動します。

```bash
whisper-server -m ~/.local/share/whisper-models/ggml-large-v3-turbo-q5_0.bin \
  --host 127.0.0.1 --port 8090 -l ja --convert

llama-server -m gemma-4-12b-it-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8080 -c 32768 --parallel 2
```

- 担当者向けと来場者向けのまとめを同時に作るため、llama-server は `--parallel 2` で起動します。
- アプリ側から thinking を無効にして呼び出します（有効だと 1 分近くかかるためです）。

## 起動

```bash
npm run dev            # 開発（http://localhost:3000）
npm run build && npm start   # 本番（ポート 3200）
```

DB のマイグレーションは、アプリが最初に DB を開いたときに自動で適用されます。
スキーマ（`lib/db/schema.ts`）を変えたら `npm run db:generate` でマイグレーションを作り、サーバを再起動してください。

### スマホから使う

マイクとカメラは HTTPS でないと使えません。スマホから使うときは、Cloudflare Tunnel などで HTTPS の URL を用意してください。
アプリ自体にはログイン機能がありません。公開する場合は、Cloudflare Access などで前段に認証を置いてください。

来場者アンケートだけは、認証なしで開けるようにします。前段で認証を外してよいパスは次の 4 つです。

- `/survey`
- `/survey/*`
- `/_next/static/*`
- `/favicon.ico`

それ以外（`/`、`/responses`、`/sessions/*`、`/leads/*`、`/api/*`）は、必ず認証の内側に置いてください。`/survey*` のような前方一致で書くと範囲が広がるので、上のとおりに指定します。

公開ページを足すときの注意:

- 担当者だけが使う操作は、Server Action ではなく Route Handler（`/api/...`）で作ります。Server Action は、公開しているページへの POST からも呼び出せるためです。
- 既存の `createSession`（課題メモの新規作成）は Server Action のままです。公開パス経由で呼ばれても不要な行が作られるだけで、データは読み出せません。
- 流量制限はアプリ側にありません。必要なら前段（Cloudflare の Rate Limiting など）で絞ってください。
- 来場者バッジの QR の形式は確かめていません。どんな QR でもチケットが出るので、コーヒーを渡すときに実物のバッジを確認してください。

## 画面

| パス | 対象 | 内容 |
|---|---|---|
| `/` | 担当者 | 課題メモの一覧（商談見込み順・テーマで絞り込み）、CSV 出力 |
| `/sessions/new` | 担当者 | 来場者の登録（QR 読み取り） |
| `/sessions/[id]` | 担当者 → 来場者 | 会話中は録音画面、終了後は来場者向けのまとめ |
| `/leads/[id]` | 担当者 | リードの詳細（商談見込み・次のアクション・抜き出した発言） |
| `/api/export` | 担当者 | リードの CSV（Excel で開ける UTF-8 BOM 付き） |
| `/responses` | 担当者 | アンケート回答の一覧（お渡し済みの件数、回答の内容、課題メモへのリンク）、アンケート入口の QR 表示 |
| `/api/export/survey` | 担当者 | アンケート回答の CSV |
| `/survey` | 来場者（公開） | アンケート（QR 読み取り → 設問） |
| `/survey/ticket/[token]` | 来場者（公開） | コーヒー引換チケット |

## 開発

```bash
npm run typecheck   # 型チェック
npm run lint        # ESLint
```

## プライバシー

- 録音を始める前に、来場者の同意を確認するチェックがあります。
- 音声ファイルは保存しません。
- 文字起こしのうち、Jev が課題に関係ないと判定した発言も保存しません。
- アンケートは、回答の利用に同意するチェックを入れないと送信できません。
- チケットの画面には、氏名や回答を表示しません（URL を知っていれば開けるためです）。

## ライセンス

[MIT](./LICENSE)
