import {
	AuthSuccessResponse,
	AuthErrorResponse,
	AuthServerErrorResponse,
} from "./common";
import { z } from "zod";

/**
 * Login API の型定義
 */

/**
 * POST /api/login リクエスト型
 */
export const LoginRequest = z.object({
	email: z.string().min(1),
	password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/**
 * POST /api/login ルートの型定義
 */
export type LoginRoute = {
	Body: LoginRequest;
	Reply: AuthSuccessResponse | AuthServerErrorResponse | AuthErrorResponse;
};
