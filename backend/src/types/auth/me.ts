import { z } from "zod";
import {
	AuthSuccessResponse,
	AuthServerErrorResponse,
	AuthErrorResponse,
} from "./common";

/**
 * Me API の型定義
 */

/**
 * GET /api/me ルートの型定義
 */
export type MeRoute = {
	Reply: AuthSuccessResponse | AuthServerErrorResponse | AuthErrorResponse;
};

/**
 * PATCH /api/me リクエスト型
 */
export const UpdateMeRequest = z.object({
	name: z
		.string()
		.min(1)
		.max(15, "ユーザー名は15文字以内で入力してください")
		.regex(
			/^[a-z0-9_]+$/,
			"ユーザー名には半角英数字と「_」のみ使用できます",
		),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

/**
 * PATCH /api/me ルートの型定義
 */
export type UpdateMeRoute = {
	Body: UpdateMeRequest;
	Reply: AuthSuccessResponse | AuthErrorResponse | AuthServerErrorResponse;
};
