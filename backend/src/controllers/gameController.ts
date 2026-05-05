import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import {
	CreateRoomRoute,
	CreateRoundRoute,
	GetRoomRoute,
	UpdateGameModeBodySchema,
	UpdateGameModeParamsSchema,
	UpdateGameModeRoute,
	JoinByTokenBodySchema,
	JoinByTokenRoute,
} from "../types/room/room";
import { RoomStatus } from "../generated/prisma/enums";

/*
 * GET /api/rooms/:roomId/game Game用ルーム詳細取得
 */
export const getGameRoomDetails = async (
	request: FastifyRequest<GetRoomRoute>,
	reply: FastifyReply,
) => {
	const room = await prisma.room.findUnique({
		where: {
			id: Number(request.params.roomId),
		},
		select: {
			status: true,
			game_mode: true,
			members: {
				select: {
					user_id: true,
					role: true,
					score: true,
					is_ready: true,
					user: {
						select: {
							name: true,
						},
					},
				},
				orderBy: {
					joined_at: "asc",
				},
			},
			rounds: {
				select: {
					started_at: true,
					ended_time: true,
					drawer_id: true,
				},
			},
		},
	});
	if (!room) {
		return reply.code(404).send({ error: "Room not found" });
	}
	if (room.status === RoomStatus.FINISHED) {
		return reply.code(403).send({ error: "Room has finished" });
	}
	const { status: _status, ...roomData } = room;
	return reply.code(200).send(roomData);
};
