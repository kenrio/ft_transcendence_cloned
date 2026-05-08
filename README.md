# ブラウザで動作するオンラインお絵描き当てゲーム「お絵描きアイランド」

開発リポジトリ: https://github.com/kenrio/ft_transcendence

Gartic Phoneに着想を得たリアルタイム・マルチプレイヤーゲーム「お絵描きアイランド」を4人チームで開発。チーム内では主に技術面を担当した。

プレイヤーが順番にお題を描き、他のプレイヤーが回答を当てるゲーム。複数プレイヤーの描画ストロークやチャット、回答判定、スコアリングをWebSocketによってリアルタイムに同期する。技術選定からアーキテクチャ設計、リアルタイムゲームエンジンの実装までを担当した。

技術スタック：

- フロントエンド：React / TypeScript
- バックエンド：Fastify / Prisma / PostgreSQL
- リアルタイム通信：WebSocket
- インフラ：Docker Compose

機能：

- リアルタイムマルチプレイヤー対戦（最大8人、描画ストローク・チャット・回答の同期）
- ゲームステート管理（タイマー、ターン進行、ラウンド制御）
- 通常モード / 一筆書き(ONE_STROKE)モードの2種のゲームモード
- 観戦者モード（描画・チャット不可、プレイヤー枠満員時も観戦者として参加可能）
- 再戦(Rematch)機能
- 回答判定とスコアリング
- ゲーム結果のリザルト画面とDB永続化

担当範囲：

- 技術選定およびプロジェクト基盤構築（React / Fastify / PostgreSQL / Docker Compose）
    -
- ゲーム画面、リアルタイムゲームエンジンの実装：
    - 描画同期（描画位置のWebSocket送信、座標補正）
    - チャット・回答判定
    - タイマー管理・ラウンド進行制御
    - スコアリング（リアルタイム管理 + ラウンド終了時のDB保存）
- リザルト画面の実装

## 実行環境

- Docker / Docker Compose

ホストOSは選ばず、Docker環境があればmacOS・Linux・Windows問わず動作する。

## 実行方法

ビルドおよび起動：

```
$ make
```

ブラウザでアクセス：

```
http://localhost:5173
```

☆要確認：環境変数ファイル（.env）の設定が必要な場合、その手順

## 苦労した点

- WebSocket再接続制御の安定化

    開発初期、再接続処理を実装したところ「接続→切断→再接続」を短時間で繰り返す無限ループが発生した。原因は、Reactのライフサイクル（StrictModeでのuseEffect二重実行、コンポーネントのアンマウント）とWebSocketイベント（onclose）が競合し、cleanupされるべき古いソケットのoncloseが新しい接続を再生成してことだった。

    対策として、二段構えのアプローチを取った：
    - useEffectのcleanup関数で「このcleanupによる切断か」を示すフラグ（`closedByCleanupRef`）を立て、意図的な切断時には再接続をスキップ
        - `frontend/src/pages/Waiting.tsx`, `frontend/src/pages/Game.tsx`：`closedByCleanupRef()`, `isMountedRef`による意図しない再接続の抑止
    - 再接続が必要な切断に対しては指数バックオフ（最大10秒）を導入し、サーバー側の負荷とリトライ間隔を制御
        - `frontend/src/pages/Waiting.tsx`, `frontend/src/pages/Game.tsx`：`reconnectAttemptRef`と`Math.pow(2, attempt)`による指数バックオフ

    さらに、画面ごと（ロビー、ゲーム準備、ゲーム中、結果）に必要な再接続処理が異なるため、それぞれに適した制御を設計し、チーム内で共有した。

## 工夫・力をいれた点

- WebSocketとHTTPを使い分けた通信アーキテクチャ設計

    画面の特性に応じて WebSocket と HTTP を使い分ける設計を採用した。ゲーム準備画面では更新頻度が低いことから「WebSocketは状態変化の通知のみに使い、データ取得はHTTPで行う」方式とし、ゲーム画面ではリアルタイム性を最優先して「すべてWebSocketで処理する」方式を採用。各画面の要求特性に合わせて通信方式を選択することで、リアルタイム性とサーバー負荷のバランスを取った。
    - `frontend/src/pages/Game.tsx`：描画（`DRAW`）、チャット（`CHAT`）、タイマー（`TIMER`）、スコア（`CORRECT_ANSWER`）など、ゲーム中の状態変化はすべてWebSocketで完結
    - `backend/src/ws/roomManager.ts` の `broadcstToRoom()`：ルーム単位での効率的なブロードキャスト

- リアルタイム性と永続性を両立するデータ管理設計

    スコア管理について、リアルタイム性を担保するためメモリ内のMap（`Map<userId, score>`）で管理し、ラウンド終了時にPrismaトランザクションでDBへバッチ保存する二層構造を採用した。これにより、毎フレーム・毎イベントでDBにアクセスすることによるレスポンス低下を回避しつつ、ゲーム結果のデータ永続性を確保した。
    - `backend/src/ws/roomManager.ts` の `addScore()`, `getScores()`：メモリ内Mapでのリアルタイムスコア更新
    - `backend/src/ws/roomManager.ts` の `saveScoresToDB()`：`prisma.$transaction`でラウンド終了時に全プレイヤーのスコアを一括保存
    - `backend/src/ws/timerManager.ts` の `startTimer()`：タイマー終了時に`saveScoresToDB()` → `endRound()` → `finalizeGame()` の順で永続化

- チート対策のためのバックエンドへのゲームロジック集約

    リアルタイム対戦ゲームえは、クライアント側のコードはユーザーから改ざん可能であるため、ゲーム進行に関わるロジックをフロントに置くと不正行為（タイマー操作、お題の盗み見など）の余地が生まれる。これを防ぐため、ゲームロジックを可能な限りバックエンドに集約する設計方針を採った。
    - タイマーはサーバー側で動作させ、クライアントには残り時間のみをブロードキャストする構造とすることで、クライアント側でのタイマー改ざんを防止
        - `backend/src/ws/timerManager.ts` の `startTimer()`：サーバー側で`setInterval()`によるカウントダウンを実行し、`broadcastToRoom`で各クライアントに残り時間を配信
    - お題（word）はロール（drawer/guesser/spectator）に応じて配信を出し分ける、回答者・観戦者にはお題が渡らないようにすることで、回答者側のチートを防止
        - `backend/src/ws/connectionHanlder.ts` の `ROUND_STARTED` ブロードキャスト：drawerには`word`を含めて送信、それ以外には`word: null`で送信
    - 回答判定もバックエンドで実行し、フロントは判定結果（正解/不正解）のみを受け取る構造とした
        - `backend/src/ws/chatHandler.ts` の `handlerChatMessage()`：サーバー側で`text === word`を比較し、正解時のみ`CORRECT_ANSWER`をブロードキャスト

- チーム開発におけるCI設計と運用

    型チェック・ビルド・フォーマット(Prettier)を行うCI（GitHub Actions）を整備し、PRテンプレートおよびブランチ命名規則（`<issue番号>-<feat|fix>-<説明>`）と組み合わせることで、レビュー観点の統一と品質の担保を行なった。4人チームでの並行開発においても、マージ時の手戻りを最小化する体制を構築した。

    また、フロントエンド・バックエンド両方でTypeScriptを採用し、型定義をディレクトリ単位で分離（`frontend/src/types`、`backend/src/types`）することで、APIレスポンス型・WebSocketメッセージ型・ドメインモデルの責務を明確化した。

## 参考にしたソースファイル

- React 公式ドキュメント (https://react.dev)
    - 参考箇所: React Hooks (useEffect, useState, useRef)、StrictMode下での挙動、useEffectのクリーンアップ

- WebSocket API (MDN) (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
    - 参考箇所: WebSocketクライアントの onopen/onclose/onerror ハンドリング

- Fastify 公式ドキュメント (https://fastify.dev)
    - 参考箇所: ルーティング、@fastify/websocketプラグインの使い方

- Prisma 公式ドキュメント (https://www.prisma.io/docs)
    - 参考箇所: スキーマ定義、トランザクション、`SELECT ... FOR UPDATE`
