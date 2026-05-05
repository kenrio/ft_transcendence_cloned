import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { avatarOrDefault } from "../constants/avatar";
import {
	ProfileRequest,
	ProfileSuccessResponse,
	ProfileRoute,
	Ranker,
} from "../types/profile";
import { getUserIdFromRequest } from "../lib/auth";
import {
	UserBadgeRequest,
	UserBadgeSuccessResponse,
	UserBadgeRoute,
} from "../types/userbadge";

/**
 * LaravelのUserControllerに相当
 */
export const getHello = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	return {
		message: "Hello from Controller!",
		timestamp: new Date().toISOString(),
	};
};

export const getUsers = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	const users = await prisma.user.findMany();
	return users;
};

/**
 * GET /profile
 */
export const getProfile = async (
	request: FastifyRequest<ProfileRoute>,
	reply: FastifyReply<ProfileRoute>,
) => {
	const userId = await getUserIdFromRequest(request);
	if (!userId) return reply.code(404).send({ message: "User not found" });
	const user = await prisma.user.findUnique({
		where: { id: Number(userId) },
	});
	if (!user) return reply.code(404).send({ message: "User not found" });

	const userBadgesWithDetails = await prisma.userBadge.findMany({
		where: {
			user_id: Number(userId),
		},
		include: {
			badge: true,
		},
	});
	const badges: string[] = [];
	userBadgesWithDetails.forEach((ub: any) => {
		if (ub.badge) {
			badges.push(ub.badge.name);
		}
	});

	const ranking = await prisma.user.findMany({
		take: 10,
		orderBy: {
			total_score: "desc",
		},
	});

	const ranker: Ranker[] = ranking.map((topuser: any) => ({
		name: topuser.name,
		score: topuser.total_score,
	}));

	const user_rank = await prisma.user.count({
		orderBy: {
			total_score: "desc",
		},
		where: {
			total_score: { gt: user.total_score ?? 0 },
		},
	});

	const data: ProfileSuccessResponse = {
		name: user.name,
		avatar: avatarOrDefault(user.avatar),
		total_score: user.total_score ?? 0,
		first_place_count: user.first_place_count ?? 0,
		play_count: user.play_count ?? 0,
		badges: badges ?? 0,
		user_rank: user_rank ?? 0,
		top_ranker: ranker ?? 0,
	};
	return data;
};

/*
 * POST /api/userbadge
 */
export const updateUserbadge = async (
	request: FastifyRequest<UserBadgeRoute>,
	reply: FastifyReply,
) => {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) return reply.code(404).send({ message: "User not found" });

		const user = await prisma.user.findUnique({
			where: { id: Number(userId) },
			include: { badges: true },
		});
		if (!user) return reply.code(404).send({ message: "User not found" });

		const userBadgesWithDetails = await prisma.userBadge.findMany({
			where: {
				user_id: Number(userId),
			},
			include: {
				badge: true,
			},
		});
		const badges: number[] = [];
		userBadgesWithDetails.forEach((ub: any) => {
			if (ub.badge) {
				badges.push(ub.badge.id);
			}
		});

		const badgesToAdd: number[] = [];
		const firstPlaceCount = user.first_place_count ?? 0; // nullなら0
		const playCount = user.play_count ?? 0;
		const totalScore = user.total_score ?? 0;
		// バッジID 1=firstWin, 2=happyPlayer, 3=richScore
		if (firstPlaceCount > 0 && !badges.includes(1)) {
			badgesToAdd.push(1);
		}
		if (playCount >= 5 && !badges.includes(2)) {
			badgesToAdd.push(2);
		}
		if (totalScore >= 100 && !badges.includes(3)) {
			badgesToAdd.push(3);
		}

		// createMany + skipDuplicates で同時リクエスト時の重複エラーを回避
		if (badgesToAdd.length > 0) {
			await prisma.userBadge.createMany({
				data: badgesToAdd.map(badgeId => ({
					user_id: Number(userId),
					badge_id: badgeId,
				})),
				skipDuplicates: true,
			});
		}
		const get_badges_names = [];
		for (const badgeId of badgesToAdd) {
			const badge_data = await prisma.badge.findUnique({
				where: { id: badgeId },
			});
			if (badge_data) {
				get_badges_names.push(badge_data);
			}
		}
		const data: UserBadgeSuccessResponse = {
			getbadges: get_badges_names,
		};
		return data;
	} catch (error) {
		console.log("updateUserbadge:", error);
		return reply.code(403).send();
	}
};
