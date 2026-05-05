import { z } from "zod";

/**
 * auth系API共通レスポンス型
 */

/**
 * ユーザー名を返す成功レスポンス型 POST→201 その他→200
 */
export const AuthSuccessResponse = z.object({
	id: z.number(),
	name: z.string(),
	is_profile_complete: z.boolean(),
	avatar: z.string(),
});
export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponse>;

/**
 * エラーレスポンス型 (400/401)
 */
export const AuthErrorResponse = z.object({
	message: z.string(),
});
export type AuthErrorResponse = z.infer<typeof AuthErrorResponse>;

/**
 * サーバーエラーレスポンス型 (500)
 */
export const AuthServerErrorResponse = z.object({
	message: z.string(),
});
export type AuthServerErrorResponse = z.infer<typeof AuthServerErrorResponse>;
