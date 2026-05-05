import { FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { GoogleUserInfo } from "../../types/googleAuth";
import { avatarOrDefault } from "../../constants/avatar";
import { createSessionAndSetCookie } from "../../lib/login";
import { findUserByGoogleSub } from "../../lib/googleOAuth";
import { prisma } from "../../lib/prisma";

const FRONTEND_URL_FALLBACK =
	process.env.FRONTEND_URL ?? "http://localhost:5173";

const createGoogleUser = async (
	email: string,
	sub: string,
	picture: string,
) => {
	return await prisma.$transaction(async tx => {
		const user = await tx.user.create({
			data: {
				name: randomUUID(),
				email,
				password: null,
				is_profile_complete: false,
				avatar: avatarOrDefault(picture),
			},
			select: {
				id: true,
				is_profile_complete: true,
			},
		});
		await tx.userAuthentication.create({
			data: {
				user_id: user.id,
				provider: "google",
				provider_user_id: sub,
			},
		});
		return user;
	});
};

export const handleGoogleRegister = async (
	reply: FastifyReply,
	userInfo: GoogleUserInfo,
	frontendUrl: string = FRONTEND_URL_FALLBACK,
) => {
	const existingGoogleUser = await findUserByGoogleSub(userInfo.sub);
	if (existingGoogleUser) {
		return reply.redirect(
			frontendUrl + "/register?error=already_registered",
		);
	}
	// メールアドレスの重複確認
	const emailUser = await prisma.user.findUnique({
		where: { email: userInfo.email },
		select: { id: true },
	});
	if (emailUser) {
		return reply.redirect(
			frontendUrl + "/register?error=already_registered",
		);
	}
	// 新規ユーザー作成 → セッション作成してプロフィール設定へ
	const newUser = await createGoogleUser(
		userInfo.email,
		userInfo.sub,
		userInfo.picture,
	);
	await createSessionAndSetCookie(reply, newUser.id, {
		secure: frontendUrl.startsWith("https://"),
	});
	return reply.redirect(frontendUrl + "/setup-profile");
};
