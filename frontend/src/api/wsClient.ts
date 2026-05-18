import { getBackendBaseUrl } from "./backendUrl";

/**
 * WebSocket URLを生成
 */
export const getWebSocketUrl = () => {
	const wsEnv = (import.meta.any.VITE_WS_URL ?? "").trim();
	if (wsEnv) return wsEnv.replace(/\/$/, "") + "/ws";

	const base = getBackendBaseUrl();
	return base.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";
};

/**
 * WebSocket接続を作成
 */
export const createWebSocket = (): WebSocket => {
	const url = getWebSocketUrl();
	return new WebSocket(url);
};
