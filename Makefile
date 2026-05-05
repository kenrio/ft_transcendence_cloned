.PHONY: up down restart build logs ps local ngrok stop-ngrok logs-ngrok url-ngrok prisma-studio seed reset

# ngrok を含めて全サービス起動
up:
	docker compose --profile ngrok up -d
	@sleep 5
	docker compose exec backend npx prisma migrate deploy
	docker compose exec backend npx prisma generate
	@sleep 5 && $(MAKE) seed
	@sleep 5 && printf "\nAccess to:\n" && $(MAKE) url-ngrok

# ngrok 以外を起動（ローカル開発用）
local:
	docker compose up -d

down:
	docker compose --profile ngrok down

restart: down up

build:
	docker compose build

logs:
	docker compose logs -f

ps:
	docker compose ps

# ngrok トンネルのみ起動（make local 後に ngrok を追加したい場合）
ngrok:
	docker compose --profile ngrok up -d ngrok

# ngrok のみ停止（frontend/backend/db は起動したまま）
stop-ngrok:
	docker compose --profile ngrok stop ngrok

logs-ngrok:
	docker compose --profile ngrok logs -f ngrok

# ngrok のトンネル URL を表示（Traffic Inspector API から取得）
url-ngrok:
	@curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4 || curl -s http://localhost:4040/api/endpoints 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "ngrok が起動していません。make ngrok を実行してください。"

# Prisma Studio 起動（http://localhost:5555 でアクセス）
prisma-studio:
	docker compose exec backend npx prisma studio

# DB にシードデータを投入
seed:
	docker compose exec backend npx prisma db seed

# DB をリセット（マイグレーションの再適用のみ、シードは投入しない）
reset:
	docker compose exec backend npx prisma migrate reset --force --skip-seed
