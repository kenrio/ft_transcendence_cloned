import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma";

/**
 * sessionIDからuser_idを取得し、返す。
 * sessionIDがない・セッションが無効(revoked/期限切れ)なら、nullを返す。
 */
export const getUserIdFromSessionId = async (
	sessionId: string | undefined,
): Promise<number | null> => {
	if (!sessionId) return null;

	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		select: { user_id: true, revoked_at: true, expires_at: true },
	});

	if (!session) return null;
	if (session.revoked_at !== null) return null;
	if (session.expires_at <= new Date()) return null;

	return session.user_id;
};

/**
 * FastifyRequestからCookie(session_id) を読み取り、user_id を返す。
 * sessionIDがない・無効なら、nullを返す
 */
export const getUserIdFromRequest = async (
	request: FastifyRequest,
): Promise<number | null> => {
	const cookieName = "session_id";
	const sessionId = request.cookies?.[cookieName];

	return getUserIdFromSessionId(sessionId);
};
