import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";

const COOKIE_NAME = "session_id";

/**
 * POST /api/logout ログアウト（セッション無効化・Cookie削除）
 */
export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
	const sessionId = request.cookies?.[COOKIE_NAME];

	if (sessionId) {
		await prisma.session.updateMany({
			where: { id: sessionId },
			data: { revoked_at: new Date() },
		});
	}

	// Cookieを削除（setCookie時と同じオプションが必要）
	const origin = (request.headers.origin ??
		request.headers.referer ??
		"") as string;
	const useSecure =
		process.env.NODE_ENV === "production" ||
		process.env.FRONTEND_URL?.startsWith("https://") ||
		origin.startsWith("https://");
	reply.clearCookie(COOKIE_NAME, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: useSecure,
		maxAge: 0,
	});

	return reply.code(200).send({ message: "ログアウトしました" });
};
