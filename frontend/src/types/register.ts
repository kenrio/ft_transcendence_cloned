export const REGISTER_ERROR_MESSAGES: Record<string, string> = {
	invalid_request:
		"認証の有効期限が切れたか、不正なリクエストです。再度お試しください",
	already_registered:
		"すでに登録済みです。ログイン画面からログインしてください",
	server_error:
		"予期しないエラーが発生しました。時間をおいて再度お試しください",
};

export type RegisterError =
	| { type: "field"; field: "name" | "email" | "password"; message: string }
	| { type: "server"; message: string }
	| { type: "unknown"; message: string };

export type RegisterField = "name" | "email" | "password" | "passwordConfirm";
export type FormErrors = Partial<Record<RegisterField, string>>;
