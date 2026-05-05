import type { FastifyReply } from "fastify";
import { prisma } from "./prisma";
import { randomUUID } from "crypto";
import { AuthSuccessResponse } from "../types/auth/common";
import { avatarOrDefault } from "../constants/avatar";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; //1日

/**
 * セッションを作成し、session_id を Cookie にセットする
 * ログイン処理したい時に呼び出す
 */
export const createSessionAndSetCookie = async (
	reply: FastifyReply,
	userId: number,
	options?: { secure?: boolean },
) => {
	// セッションIDとuserIDを紐づけて保存
	const now = new Date();
	const newSession = await prisma.session.create({
		data: {
			id: randomUUID(),
			user_id: userId,
			expires_at: new Date(now.getTime() + SESSION_TTL_MS),
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					is_profile_complete: true,
					avatar: true,
				},
			},
		},
	});

	// Cookie に session_id をセット（HTTPS 時は secure: true）
	const useSecure =
		options?.secure ??
		(process.env.NODE_ENV === "production" ||
			process.env.FRONTEND_URL?.startsWith("https://"));
	reply.setCookie("session_id", newSession.id, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: useSecure,
		expires: newSession.expires_at,
	});

	const successResponse: AuthSuccessResponse = {
		id: newSession.user.id,
		name: newSession.user.name,
		is_profile_complete: newSession.user.is_profile_complete,
		avatar: avatarOrDefault(newSession.user.avatar),
	};
	return successResponse;
};
