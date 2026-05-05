import { FastifyReply } from "fastify";
import { GoogleUserInfo } from "../../types/googleAuth";
import { createSessionAndSetCookie } from "../../lib/login";
import {
	findUserByGoogleSub,
	updateGoogleUserAvatar,
} from "../../lib/googleOAuth";
import { prisma } from "../../lib/prisma";

const FRONTEND_URL_FALLBACK =
	process.env.FRONTEND_URL ?? "http://localhost:5173";

export const handleGoogleLogin = async (
	reply: FastifyReply,
	userInfo: GoogleUserInfo,
	frontendUrl: string = FRONTEND_URL_FALLBACK,
) => {
	const existingGoogleUser = await findUserByGoogleSub(userInfo.sub);
	if (!existingGoogleUser) {
		// Googleアカウント未登録 → メールアドレスの重複確認
		const emailUser = await prisma.user.findUnique({
			where: { email: userInfo.email },
			select: { id: true },
		});
		if (emailUser) {
			// 同一メールがパスワードで登録済み
			return reply.redirect(frontendUrl + "/login?error=email_conflict");
		}
		// Googleアカウント自体が未登録
		return reply.redirect(frontendUrl + "/login?error=account_not_found");
	}
	// 既存Googleユーザー → アバターを最新のプロフィール画像で更新
	if (userInfo.picture) {
		await updateGoogleUserAvatar(existingGoogleUser.id, userInfo.picture);
	}
	// セッション作成してトップへ
	await createSessionAndSetCookie(reply, existingGoogleUser.id, {
		secure: frontendUrl.startsWith("https://"),
	});
	return reply.redirect(frontendUrl + "/");
};
