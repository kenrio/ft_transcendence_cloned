import { FastifyReply, FastifyRequest } from "fastify";
import { getUserIdFromRequest } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { avatarOrDefault } from "../../constants/avatar";
import { MeRoute } from "../../types/auth/me";

/**
 * GET /api/me
 *
 * 成功(ログイン済み): 200 { id, name, is_profile_complete }
 * 失敗(未ログイン): 401 { message }
 * 失敗(サーバーエラー): 500 { message }
 *
 * セッションIDは Cookie(session_id) から取得し、
 * Sessionテーブルの revoked_at/expires_at を検証して user を返す。
 */
export const me = async (
	request: FastifyRequest<MeRoute>,
	reply: FastifyReply<MeRoute>,
) => {
	try {
		const userId = await getUserIdFromRequest(request);
		if (userId === null) {
			return reply.code(401).send({ message: "Unauthorized" });
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				is_profile_complete: true,
				avatar: true,
			},
		});

		if (!user) {
			return reply.code(401).send({ message: "Unauthorized" });
		}

		return reply.code(200).send({
			id: user.id,
			name: user.name,
			is_profile_complete: user.is_profile_complete,
			avatar: avatarOrDefault(user.avatar),
		});
	} catch (err) {
		request.log?.error?.(err);
		return reply.code(500).send({
			message:
				"予期しないエラーが発生しました。時間をおいて再度お試しください",
		});
	}
};
