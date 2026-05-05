import { FastifyReply, FastifyRequest } from "fastify";
import { getUserIdFromRequest } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { avatarOrDefault } from "../../constants/avatar";
import { UpdateMeRequest, UpdateMeRoute } from "../../types/auth/me";

/**
 * PATCH /api/me
 *
 * セッション Cookie でユーザー取得（認証チェック）し、
 * name の重複チェック後に User.name と is_profile_complete を更新する。
 *
 * 成功: 200 { id, name, is_profile_complete: true }
 * 失敗(未ログイン): 401 { message }
 * 失敗(ユーザー名はすでに設定済み): 403 { message }
 * 失敗(バリデーション・ユーザー名重複): 400 { message }
 * 失敗(サーバーエラー): 500 { message }
 */
export const updateMe = async (
	request: FastifyRequest<UpdateMeRoute>,
	reply: FastifyReply<UpdateMeRoute>,
) => {
	const userId = await getUserIdFromRequest(request);
	if (userId === null) {
		return reply.code(401).send({ message: "Unauthorized" });
	}

	const parsed = UpdateMeRequest.safeParse(request.body);
	if (!parsed.success) {
		const firstIssue = parsed.error.issues[0];
		const message = firstIssue?.message ?? "入力に不備があります。";
		return reply.code(400).send({ message });
	}
	const { name } = parsed.data;

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { is_profile_complete: true },
		});
		if (user?.is_profile_complete === true) {
			return reply.code(403).send({
				message:
					"すでにユーザー名が設定されています。現在、ユーザー名の変更は受け付けておりません。",
			});
		}

		//nameの重複チェック
		const existingUserWithName = await prisma.user.findUnique({
			where: { name },
			select: { id: true },
		});
		if (
			existingUserWithName !== null &&
			existingUserWithName.id !== userId
		) {
			return reply.code(400).send({
				message: "このユーザー名は既に使用されています",
			});
		}

		//DBインサート
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				name,
				is_profile_complete: true,
			},
			select: {
				id: true,
				name: true,
				avatar: true,
			},
		});

		return reply.code(200).send({
			id: updatedUser.id,
			name: updatedUser.name,
			is_profile_complete: true,
			avatar: avatarOrDefault(updatedUser.avatar),
		});
	} catch (err) {
		request.log?.error?.(err);
		return reply.code(500).send({
			message:
				"予期しないエラーが発生しました。時間をおいて再度お試しください",
		});
	}
};
