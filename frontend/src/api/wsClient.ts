import { getBackendBaseUrl } from "./backendUrl";

/**
 * WebSocket URLを生成
 */
export const getWebSocketUrl = () => {
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
