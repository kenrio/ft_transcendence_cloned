/**
 * バックエンドのベースURLを取得
 * - localhost:5173 のとき: http://localhost:3000（バックエンドに直接アクセス、Cookie が正しく送信される）
 * - VITE_API_URL が設定されているとき（ngrok等）: その値を使用
 * - それ以外: 同一オリジン（window.location.origin）
 */
export const getBackendBaseUrl = (): string => {
	// localhost:5173 のときは常に localhost:3000（APP_URL が設定されていても優先）
	if (
		window.location.hostname === "localhost" &&
		window.location.port === "5173"
	) {
		return "http://localhost:3000";
	}

	const env = (import.meta.env.VITE_API_URL ?? "").trim();
	if (env) return env.replace(/\/$/, "");

	return window.location.origin;
};
