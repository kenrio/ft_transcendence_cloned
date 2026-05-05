import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { RoomStatus, UserRole } from "../generated/prisma/enums";
import { randomUUID } from "node:crypto";
import {
	CreateRoomRoute,
	CreateRoundRoute,
	GetRoomRoute,
	UpdateGameModeBodySchema,
	UpdateGameModeParamsSchema,
	UpdateGameModeRoute,
	JoinByTokenBodySchema,
	JoinByTokenRoute,
	MAX_MEMBERS,
	MIN_PLAYERS,
} from "../types/room/room";
import { UpdateRoomMemberRoleRoute } from "../types/room/roomMember";
import {
	RoomIdParamsSchema,
	RoomMemberBodySchema,
	RoomMemberParamsSchema,
	RoomMemberRoute,
} from "../types/room/common";
import { updateReadyStatus, leaveRoomMember } from "../services/roomService";
import { getUserIdFromRequest } from "../lib/auth";
import { broadcastToRoom, getRoomSize } from "../ws/roomManager";

/*
 * POST /api/rooms ルーム作成
 */
export const createRoom = async (
	request: FastifyRequest<CreateRoomRoute>,
	reply: FastifyReply,
) => {
	try {
		const room = await prisma.room.create({
			data: {
				host_id: request.body.hostId,
				invitation_token: randomUUID(),
				members: {
					create: {
						user_id: request.body.hostId,
						role: UserRole.PLAYER,
					},
				},
			},
		});
		return reply.code(201).send(room);
	} catch (error) {
		console.log("createRoomError:", error);
		return reply.code(403).send();
	}
};

/*
 * GET /api/rooms/:roomId ルーム詳細取得
 */
export const getRoomDetails = async (
	request: FastifyRequest<GetRoomRoute>,
	reply: FastifyReply,
) => {
	const room = await prisma.room.findUnique({
		where: {
			id: Number(request.params.roomId),
		},
		select: {
			id: true,
			game_mode: true,
			host_id: true,
			invitation_token: true,
			status: true,
			members: {
				select: {
					room_id: true,
					user_id: true,
					is_ready: true,
					role: true,
					joined_at: true,
					user: {
						select: {
							id: true,
							name: true,
							avatar: true,
						},
					},
				},
				orderBy: {
					joined_at: "asc",
				},
			},
			rounds: {
				select: { id: true },
			},
		},
	});
	if (!room) {
		return reply.code(404).send({ error: "Room not found" });
	}
	if (room.status === RoomStatus.FINISHED) {
		return reply.code(403).send({ error: "Room has finished" });
	}
	return reply.code(200).send(room);
};

/*
 * GET /api/rooms/:roomId/members ルームメンバーの取得
 */
export const getRoomMembers = async (
	request: FastifyRequest<RoomMemberRoute>,
	reply: FastifyReply,
) => {
	const paramResult = RoomIdParamsSchema.safeParse(request.params);
	if (!paramResult.success) {
		return reply
			.code(400)
			.send({ message: "パラメータに不備があります。" });
	}

	const roomId = paramResult.data.roomId;
	try {
		const room = await prisma.room.findUnique({
			where: { id: roomId },
			select: { status: true },
		});
		if (!room) {
			return reply.code(404).send({ error: "Room not found" });
		}
		if (room.status === RoomStatus.FINISHED) {
			return reply.code(403).send({ error: "Room has finished" });
		}
		const roomMembers = await prisma.roomMember.findMany({
			where: {
				room_id: roomId,
			},
			include: {
				user: true,
			},
			orderBy: {
				joined_at: "asc",
			},
		});
		return reply.code(200).send(roomMembers);
	} catch (error) {
		console.error("Error:", error);
		return reply.code(500).send({ error: "Failed to fetch roomMembers" });
	}
};

/*
 * PATCH /api/rooms/:id/members/:userId ルームメンバー更新
 */
export const updateRoomMemberRole = async (
	request: FastifyRequest<UpdateRoomMemberRoleRoute>,
	reply: FastifyReply,
) => {
	const requesterId = await getUserIdFromRequest(request);
	if (!requesterId) {
		return reply.code(401).send({ error: "Unauthorized" });
	}
	const paramResult = RoomMemberParamsSchema.safeParse(request.params);
	if (!paramResult.success) {
		return reply
			.code(400)
			.send({ message: "パラメータに不備があります。" });
	}
	const { roomId, userId } = paramResult.data;
	const { role } = request.body;
	const room = await prisma.room.findUnique({
		where: { id: roomId },
		include: {
			members: {
				where: { role: UserRole.PLAYER },
			},
		},
	});
	if (!room) {
		return reply.code(404).send({ error: "Room not found" });
	}
	const targetUserId = userId;
	const isHost = room.host_id === requesterId;
	const isSelf = targetUserId === requesterId;
	// SPECTATOR→PLAYER への変更時、プレイヤー数が上限を超える場合は拒否
	if (role === UserRole.PLAYER) {
		const currentMember = await prisma.roomMember.findUnique({
			where: {
				room_id_user_id: { room_id: roomId, user_id: userId },
			},
		});
		const isChangingToPlayer =
			!currentMember || currentMember.role !== UserRole.PLAYER;
		if (isChangingToPlayer && room.members.length >= MAX_MEMBERS) {
			return reply.code(400).send({
				error: "プレイヤーの定員に達しています。",
			});
		}
	}
	if (!isHost && !isSelf) {
		const currentMember = await prisma.roomMember.findUnique({
			where: {
				room_id_user_id: {
					room_id: roomId,
					user_id: userId,
				},
			},
			include: { user: true },
		});
		return reply.code(200).send(currentMember);
	}
	try {
		const updatedMember = await prisma.roomMember.update({
			where: {
				room_id_user_id: {
					room_id: roomId,
					user_id: userId,
				},
			},
			data: { role: role },
		});
		broadcastToRoom(String(roomId), {
			type: "memberRoleUpdated",
			userId: userId,
			role: role,
		});
		return reply.code(200).send(updatedMember);
	} catch (error) {
		console.log(error);
		return reply
			.code(500)
			.send({ error: "Failed to update room member role" });
	}
};

/*
 * PATCH /api/rooms/:roomId/game-mode ゲームモード変更
 */
export const updateGameMode = async (
	request: FastifyRequest<UpdateGameModeRoute>,
	reply: FastifyReply,
) => {
	const paramResult = UpdateGameModeParamsSchema.safeParse(request.params);
	const bodyResult = UpdateGameModeBodySchema.safeParse(request.body);

	if (!paramResult.success) {
		return reply
			.code(400)
			.send({ message: "パラメータに不備があります。" });
	}

	if (!bodyResult.success) {
		return reply
			.code(400)
			.send({ message: "リクエストボディに不備があります。" });
	}

	const roomId = paramResult.data.roomId;
	const mode = bodyResult.data.mode;

	try {
		const updatedMode = await prisma.room.update({
			where: {
				id: roomId,
			},
			data: {
				game_mode: mode,
			},
		});
		broadcastToRoom(String(roomId), {
			type: "gameModeUpdated",
			mode: mode,
		});
		return reply.code(200).send(updatedMode);
	} catch (error) {
		console.log(error);
		return reply.code(500).send({ error: "Failed to update game mode" });
	}
};

/*
 * PATCH /api/rooms/:roomId/members/:userId/ready 各プレイヤーの準備ステータス
 */
export const updateRoomMemberReady = async (
	request: FastifyRequest<RoomMemberRoute>,
	reply: FastifyReply,
) => {
	try {
		const paramResult = RoomMemberParamsSchema.safeParse(request.params);
		const bodyResult = RoomMemberBodySchema.safeParse(request.body);

		if (!paramResult.success) {
			return reply
				.code(400)
				.send({ message: "パラメータに不備があります。" });
		}

		if (!bodyResult.success) {
			return reply
				.code(400)
				.send({ message: "リクエストボディに不備があります。" });
		}

		const { roomId, userId } = paramResult.data;
		const isReady = bodyResult.data.isReady;

		const userStatus = await updateReadyStatus(roomId, userId, isReady);

		return reply.code(200).send(userStatus);
	} catch (error) {
		console.log(error);
		return reply.code(500).send({ error: "Failed to update user status" });
	}
};

/*
 * POST /api/rooms/join 招待URLから参加したユーザをルームに追加する
 */
export const joinRoomByToken = async (
	request: FastifyRequest<JoinByTokenRoute>,
	reply: FastifyReply,
) => {
	const userId = await getUserIdFromRequest(request);
	if (!userId) return reply.code(401).send({ error: "Unauthorized" });

	const bodyResult = JoinByTokenBodySchema.safeParse(request.body);
	if (!bodyResult.success) {
		return reply.code(400).send({ message: "招待URLに不備があります。" });
	}
	const { token } = bodyResult.data;

	const room = await prisma.room.findUnique({
		where: { invitation_token: token },
		include: {
			members: true,
		},
	});
	if (!room) {
		return reply.code(404).send({ message: "招待が無効です。" });
	}
	if (room.status === RoomStatus.FINISHED) {
		return reply.code(403).send({ error: "Room has finished" });
	}
	const roomId = room.id;
	const existingMember = await prisma.roomMember.findUnique({
		where: {
			room_id_user_id: { room_id: roomId, user_id: userId },
		},
	});
	if (!existingMember && room.members.length >= MAX_MEMBERS) {
		return reply.code(400).send({
			message: "ルームの定員に達しています。",
		});
	}
	try {
		if (existingMember) {
			// 既にメンバーなら何もしない（二重参加・リロード対策）
			return reply.code(200).send({ roomId });
		}
		await prisma.roomMember.create({
			data: {
				room_id: roomId,
				user_id: userId,
				role: UserRole.PLAYER,
			},
		});
		try {
			broadcastToRoom(String(roomId), { type: "memberJoined" });
		} catch (broadcastError) {
			console.error("Broadcast error (non-fatal):", broadcastError);
		}
		return reply.code(200).send({ roomId });
	} catch (error: unknown) {
		// P2002: ユニーク制約違反（競合で既に参加済み）→ 成功扱い
		const prismaError = error as { code?: string };
		if (prismaError?.code === "P2002") {
			return reply.code(200).send({ roomId });
		}
		console.error("Error joining room:", error);
		const message =
			error instanceof Error ? error.message : "Failed to join room";
		return reply.code(500).send({ error: message });
	}
};

/*
 * POST /api/rooms/:roomId/leave ルームから退出
 */
export const leaveRoom = async (
	request: FastifyRequest<{ Params: { roomId: string } }>,
	reply: FastifyReply,
) => {
	const userId = await getUserIdFromRequest(request);
	if (!userId) return reply.code(401).send({ error: "Unauthorized" });

	const roomId = Number(request.params.roomId);
	if (Number.isNaN(roomId) || roomId <= 0) {
		return reply
			.code(400)
			.send({ message: "パラメータに不備があります。" });
	}

	try {
		const result = await leaveRoomMember(roomId, userId);

		if (!result.success) {
			const statusCode =
				result.error === "Room not found" ||
				result.error === "Not a member of this room"
					? 404
					: 500;
			return reply.code(statusCode).send({ error: result.error });
		}

		return reply.code(200).send({ success: true });
	} catch (error) {
		// Strict Mode の回避策
		// 複数Requestが同時に来ると、roomMemberのupsertで競合し、2件目以降が500になることがある
		const existing = await prisma.roomMember.findUnique({
			where: {
				room_id_user_id: { room_id: roomId, user_id: userId },
			},
		});
		if (existing) {
			broadcastToRoom(String(roomId), { type: "memberJoined" });
			return reply.code(200).send({ roomId });
		}
		console.error("Error JoinRoom:", error);
		return reply.code(500).send("Failed to join room");
	}
};

/*
 * POST /api/rooms/:roomId/round ラウンドの作成
 * 冪等: すでにラウンドが存在する場合はそれを返す
 */
export const createRound = async (
	request: FastifyRequest<CreateRoundRoute>,
	reply: FastifyReply,
) => {
	const paramResult = RoomIdParamsSchema.safeParse(request.params);
	if (!paramResult.success) {
		return reply.code(400).send({ message: "パラメータに不備があります" });
	}
	const roomId = paramResult.data.roomId;
	try {
		const result = await prisma.$transaction(async tx => {
			// このroomIdに対してmutexのロックをかけている、他のSQLは処理が終わるまで実行されない
			await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
			const room = await tx.room.findUnique({
				where: { id: roomId },
				include: {
					members: {
						where: { role: UserRole.PLAYER },
						include: { user: true },
						orderBy: { user_id: "asc" },
					},
				},
			});
			if (!room) throw new Error("Room not found");
			const playerIds = [
				room.host_id,
				...room.members
					.filter(m => m.user_id !== room.host_id)
					.map(m => m.user_id),
			];
			if (playerIds.length < MIN_PLAYERS) {
				throw new Error(`プレイヤーは${MIN_PLAYERS}人以上必要です。`);
			}
			// 最新のRoundを取得
			const latestRound = await tx.round.findFirst({
				where: { room_id: roomId },
				orderBy: { id: "desc" },
			});
			// latestRound の冪等チェック
			if (latestRound?.started_at === null) {
				const existing = await tx.round.findUnique({
					where: { id: latestRound.id },
					include: { drawer: true },
				});
				if (existing) return existing;
			}

			// 新規ラウンド用にRoomMemberのis_readyのリセット（Game から Prepare に戻ったとき）
			await tx.roomMember.updateMany({
				where: { room_id: roomId },
				data: { is_ready: false },
			});

			let drawerId: number;
			// Roundがなければ最初のDrawerをホストに設定
			if (!latestRound) {
				drawerId = room.host_id;
			} else {
				const currentIndex = playerIds.indexOf(latestRound.drawer_id);
				const nextIndex =
					currentIndex >= 0 && currentIndex < playerIds.length - 1
						? currentIndex + 1
						: 0;
				drawerId = playerIds[nextIndex];
			}
			return tx.round.create({
				data: {
					room_id: roomId,
					drawer_id: drawerId,
					duration: 60,
				},
				include: { drawer: true },
			});
		});
		return reply.code(201).send(result);
	} catch (error) {
		console.error("Error:", error);
		const message =
			error instanceof Error ? error.message : "Failed to create round";
		const statusCode = message.includes("プレイヤーは") ? 400 : 500;
		return reply.code(statusCode).send({ error: message });
	}
};

/**
 * POST /api/rooms/:roomId/leave-result Result画面からの離脱
 */
export const leaveResult = async (
	request: FastifyRequest<GetRoomRoute>,
	reply: FastifyReply,
) => {
	const roomId = Number(request.params.roomId);

	try {
		const roomSize = getRoomSize(String(roomId));
		if (roomSize <= 1) {
			await prisma.room.update({
				where: { id: roomId },
				data: { status: RoomStatus.FINISHED },
			});
		}
		return reply.code(200).send({ ok: true });
	} catch (error) {
		console.error(error);
		return reply.code(500).send({ error: "Failed to leave result" });
	}
};
