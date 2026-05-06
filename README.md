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
- 観戦者モード（描画・チャット不可、満員時の参加可能）
- 再戦(Rematch)機能
- 回答判定とスコアリング
- ゲーム結果のリザルト画面とDB永続化

担当範囲：

- 技術選定およびプロジェクト基盤構築（React / Fastify / PostgreSQL / Docker Compose）
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

    クライアントの意図しない切断（ネットワーク切断・タブ離脱・ページ遷移など）からの再接続処理が大きな課題となった。特にフロントエンドのライフサイクル（コンポーネントのマウント / アンマウント、useEffect の発火タイミング）と WebSocket イベント（onclose / onerror）が競合し、再接続ループ（接続・切断が短時間で繰り返される状態）が発生する問題に直面した。

    対策として、単純な再接続処理ではなく「接続状態を明示的に管理する」方針を取り、接続中・切断中・再接続中といった状態を管理するフラグを導入することで、再接続処理の制御を安定させた。

    さらに、画面ごと（ロビー、ゲーム準備、ゲーム中、結果）に必要な再接続処理が異なるため、それぞれに適した制御を設計し、チーム内で共有した。

## 工夫・力をいれた点

- WebSocketとHTTPを使い分けた通信アーキテクチャ設計

    画面の特性に応じて WebSocket と HTTP を使い分ける設計を採用した。ゲーム準備画面では更新頻度が低いことから「WebSocketは状態変化の通知のみに使い、データ取得はHTTPで行う」方式とし、ゲーム画面ではリアルタイム性を最優先して「すべてWebSocketで処理する」方式を採用。各画面の要求特性に合わせて通信方式を選択することで、リアルタイム性とサーバー負荷のバランスを取った。

- リアルタイム性と永続性を両立するデータ管理設計

    スコア管理について、リアルタイム性を担保するためメモリ内のMap（`Map<userId, score>`）で管理し、ラウンド終了時にPrismaトランザクションでDBへバッチ保存する二層構造を採用した。これにより、毎フレーム・毎イベントでDBにアクセスすることによるレスポンス低下を回避しつつ、ゲーム結果のデータ永続性を確保した。

- クライアント状態を明示的に管理した再接続制御

    再接続処理を「副作用として何となく動かす」のではなく、「接続中・切断中・再接続中」といった状態を明示的にフラグで管理する設計とした。これにより、フロントエンドのライフサイクルとWebSocketイベントが競合する状況下でも、再接続処理の挙動が予測可能となり、デバッグが容易になった。

- チーム開発におけるCI設計と運用

    型チェック・ビルド・フォーマット(Prettier)を行うCI（GitHub Actions）を整備し、PRテンプレートおよびブランチ命名規則（`<issue番号>-<feat|fix>-<説明>`）と組み合わせることで、レビュー観点の統一と品質の担保を行なった。4人チームでの並行開発においても、マージ時の手戻りを最小化する体制を構築した。

## 参考にしたソースファイル

- React 公式ドキュメント (https://react.dev)
    - 参考箇所: React Hooks (useEffect, useState, useRef)、StrictMode下での挙動、useEffectのクリーンアップ
    - ファイル名: frontend/src/api/wsClient.ts, frontend/src/pages/Waiting.tsx, frontend/src/pages/Game.tsx

- WebSocket API (MDN) (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
    - 参考箇所: WebSocketクライアントの onopen/onclose/onerror ハンドリング
    - ファイル名: frontend/src/api/wsClient.ts

- Fastify 公式ドキュメント (https://fastify.dev)
    - 参考箇所: ルーティング、@fastify/websocketプラグインの使い方
    - ファイル名: backend/src/server.ts, backend/src/ws/connectionHandler.ts

- Prisma 公式ドキュメント (https://www.prisma.io/docs)
    - 参考箇所: スキーマ定義、トランザクション、`SELECT ... FOR UPDATE`
    - ファイル名: backend/prisma/schema.prisma, backend/src/ws/roomManager.ts

- Docker Compose 公式ドキュメント (https://docs.docker.com/compose/)
    - 参考箇所: マルチコンテナ構成、サービス間通信、環境変数
    - ファイル名: docker-compose.yml

☆要確認：上記は技術スタックから推測される参考資料リスト。実際に直接参照したものに絞ってください。読んでいないものは削除を。
