import { prisma } from "./prisma";

/**
 * Google の sub（ユーザー識別子）で UserAuthentication を検索し、紐づく User を返す
 * 該当なし（Googleアカウント未登録）の場合は null を返す
 */
export const findUserByGoogleSub = async (sub: string) => {
	const userAuth = await prisma.userAuthentication.findUnique({
		where: {
			provider_provider_user_id: {
				provider: "google",
				provider_user_id: sub,
			},
		},
		include: {
			user: {
				select: {
					id: true,
					is_profile_complete: true,
				},
			},
		},
	});
	if (!userAuth) return null;
	return userAuth.user;
};

/**
 * Googleユーザーのアバターを最新のプロフィール画像で更新する
 */
export const updateGoogleUserAvatar = async (
	userId: number,
	pictureUrl: string,
) => {
	await prisma.user.update({
		where: { id: userId },
		data: { avatar: pictureUrl },
	});
};
