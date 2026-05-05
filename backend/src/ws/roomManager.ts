import { WebSocket } from "ws";
import { prisma } from "../lib/prisma";
import { RoomClient } from "../types/room/room";
import { stopTimer } from "./timerManager";
import { UserRole } from "../generated/prisma/enums";

// キー：roomId (string)
// 値: Set<RoomClient>
const rooms = new Map<string, Set<RoomClient>>();
const roomRoundState = new Map<
	string,
	{ roundId: number; word: string; drawerId: number }
>();
const roomScores = new Map<string, Map<number, number>>();

export const joinRoom = (client: RoomClient) => {
	// ルームが存在しなければ作成
	if (!rooms.has(client.roomId)) {
		rooms.set(client.roomId, new Set());
	}

	const room = rooms.get(client.roomId);
	if (room) {
		for (const existing of room) {
			if (existing.userId === client.userId) {
				room.delete(existing);
				if (
					existing.socket !== client.socket &&
					existing.socket.readyState === WebSocket.OPEN
				) {
					existing.socket.close();
				}
				break;
			}
		}
		room.add(client);

		console.log(`✅ User ${client.userId} joined room ${client.roomId}`);
		console.log(`📈 Room ${client.roomId} now has ${room.size} members`);

		const scores = roomScores.get(client.roomId);
		if (scores && !scores.has(client.userId)) {
			scores.set(client.userId, 0);
		}
	}
};

export const leaveRoom = (client: RoomClient) => {
	const room = rooms.get(client.roomId);
	if (!room) return;

	room.delete(client);
	console.log(`👋 User ${client.userId} left room ${client.roomId}`);

	// ルームが空になったらルームを削除
	if (room.size === 0) {
		rooms.delete(client.roomId);
		stopTimer(client.roomId);
		console.log(`🗑️ Room ${client.roomId} delete (empty)`);
	} else {
		console.log(`📉 Room ${client.roomId} now has ${room.size} members`);
	}
};

export const broadcastToRoom = (
	roomId: string,
	message: any,
	excludeSocket?: WebSocket,
) => {
	const room = rooms.get(roomId);
	if (!room) {
		console.log(`⚠️ Room ${roomId} not found`);
		return;
	}

	const payload = JSON.stringify(message);
	let sentCount = 0;

	room.forEach(client => {
		if (excludeSocket && client.socket === excludeSocket) return;

		if (client.socket.readyState === WebSocket.OPEN) {
			client.socket.send(payload);
			sentCount++;
		}
	});
};

export const findClientByUserId = (
	roomId: string,
	userId: number,
): RoomClient | undefined => {
	const room = rooms.get(roomId);
	if (!room) return undefined;

	for (const client of room) {
		if (client.userId === userId) return client;
	}
	return undefined;
};

export const setRoundState = (
	roomId: string,
	roundId: number,
	word: string,
	drawerId: number,
) => {
	roomRoundState.set(roomId, { roundId, word, drawerId });
};

export const getRoundState = (roomId: string) => {
	return roomRoundState.get(roomId) ?? null;
};

export const initScores = (roomId: string) => {
	if (roomScores.has(roomId)) return;

	const room = rooms.get(roomId);
	if (!room) return;

	const scores = new Map<number, number>();
	room.forEach(client => {
		scores.set(client.userId, 0);
	});
	roomScores.set(roomId, scores);
};

export const addScore = (roomId: string, userId: number, points: number) => {
	const scores = roomScores.get(roomId);
	if (!scores) return;

	const current = scores.get(userId) ?? 0;
	scores.set(userId, current + points);
};

export const getScores = (roomId: string) => {
	return roomScores.get(roomId) ?? new Map<number, number>();
};

export const saveScoresToDB = async (roomId: string) => {
	const scores = roomScores.get(roomId);
	if (!scores) return;

	const updates = [...scores].map(([userId, score]) =>
		prisma.roomMember.update({
			where: {
				room_id_user_id: {
					room_id: Number(roomId),
					user_id: userId,
				},
			},
			data: {
				score: score,
			},
		}),
	);

	await prisma.$transaction(updates);
};

export const endRound = async (roomId: string): Promise<boolean | null> => {
	// 現在のラウンド（started_atあり & ended_timeなし）を終了させる
	const currentRound = getRoundState(roomId);
	if (!currentRound) return null;

	const scores = getScores(roomId);
	if (scores.size === 0) return null;

	const scoreSorted = [...scores].sort((a, b) => b[1] - a[1]);
	const isTie =
		scoreSorted.length >= 2 && scoreSorted[0][1] === scoreSorted[1][1];
	const winnerId = isTie ? null : (scoreSorted[0]?.[0] ?? null);

	await prisma.round.update({
		where: { id: currentRound.roundId },
		data: { ended_time: new Date(), winner_id: winnerId },
	});

	// ended_timeありのラウンド数を数える
	// PLAYER数を数える
	const completedRounds = await prisma.round.count({
		where: {
			room_id: Number(roomId),
			ended_time: { not: null },
		},
	});
	const playerCount = await prisma.roomMember.count({
		where: {
			room_id: Number(roomId),
			role: UserRole.PLAYER,
		},
	});

	// ラウンド終了時にそのラウンドステートをクリア
	roomRoundState.delete(roomId);

	// 比較してisGameOverを返す
	return completedRounds >= playerCount;
};

export const isClientRegistered = (
	roomId: string,
	socket: WebSocket,
): boolean => {
	const room = rooms.get(roomId);
	if (!room) return false;
	for (const client of room) {
		if (client.socket === socket) return true;
	}
	return false;
};

export const finalizeGame = async (roomId: string) => {
	// このルームのPLAYERメンバーを取得（scoreも含めて）
	const roomPlayers = await prisma.roomMember.findMany({
		where: {
			room_id: Number(roomId),
			role: UserRole.PLAYER,
		},
	});
	const playerSorted = roomPlayers.sort((a, b) => b.score - a.score);
	const isTie =
		playerSorted.length >= 2 &&
		playerSorted[0].score === playerSorted[1].score;

	await prisma.$transaction(async tx => {
		// 各プレイヤーのUser.total_scoreとplay_countを更新
		for (const player of roomPlayers) {
			const isWinner =
				!isTie && player.user_id === playerSorted[0]?.user_id;

			await tx.user.update({
				where: { id: player.user_id },
				data: {
					total_score: { increment: player.score },
					play_count: { increment: 1 },
					...(isWinner && { first_place_count: { increment: 1 } }),
				},
			});
		}

		// Room.statusをRESULTに変更
		await tx.room.update({
			where: { id: Number(roomId) },
			data: { status: "RESULT" },
		});
	});
};

export const getRoomSize = (roomId: string): number => {
	const room = rooms.get(roomId);
	return room ? room.size : 0;
};
