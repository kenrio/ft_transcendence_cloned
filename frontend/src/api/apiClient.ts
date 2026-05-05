import { getBackendBaseUrl } from "./backendUrl";

const BASE_URL = `${getBackendBaseUrl()}/api`;

/**
 * API 通信失敗時に使用するエラークラス。
 * Error クラスを継承している。
 * @property status HTTP ステータスコード
 * @property data   サーバーが返したエラーレスポンスの body
 */
export class ApiError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, data: unknown) {
		super("API Request Failed");
		this.name = "ApiError";
		this.status = status;
		this.data = data;
	}
}

/**
 * 共通のAPIクライアント
 * fetchをラップして共通の処理（エラーハンドリング等）を行う
 */
export const apiClient = async (
	endpoint: string,
	options: RequestInit = {},
) => {
	const url = `${BASE_URL}${endpoint}`;

	// 必要に応じてヘッダーを追加
	const headers = {
		"Content-Type": "application/json",
		...options.headers,
	};

	const response = await fetch(url, {
		...options,
		headers,
		credentials: "include",
	});

	if (!response.ok) {
		// ここで共通のエラーハンドリングが可能
		const errorBody = await response.json().catch(() => ({}));
		throw new ApiError(response.status, errorBody);
	}

	return response.json();
};
