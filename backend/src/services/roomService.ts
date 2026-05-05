import { prisma } from "../lib/prisma";
import { broadcastToRoom } from "../ws/roomManager";

export type LeaveRoomResult =
	| { success: true }
	| { success: false; error: "Room not found" }
	| { success: false; error: "Not a member of this room" }
	| { success: false; error: string };

/*
 * ルームからメンバーを退出させる（DB更新・ホスト譲渡・ブロードキャスト）
 */
export const leaveRoomMember = async (
	roomId: number,
	userId: number,
): Promise<LeaveRoomResult> => {
	const room = await prisma.room.findUnique({
		where: { id: roomId },
		include: {
			members: { orderBy: { joined_at: "asc" } },
		},
	});
	if (!room) {
		return { success: false, error: "Room not found" };
	}

	const member = room.members.find(m => m.user_id === userId);
	if (!member) {
		return { success: false, error: "Not a member of this room" };
	}

	const isHost = room.host_id === userId;
	const otherMembers = room.members.filter(m => m.user_id !== userId);

	await prisma.$transaction(async tx => {
		if (isHost && otherMembers.length > 0) {
			await tx.room.update({
				where: { id: roomId },
				data: { host_id: otherMembers[0].user_id },
			});
		}
		if (otherMembers.length === 0) {
			await tx.room.update({
				where: { id: roomId },
				data: { status: "FINISHED" },
			});
		}
		await tx.roomMember.delete({
			where: {
				room_id_user_id: {
					room_id: roomId,
					user_id: userId,
				},
			},
		});
	});

	broadcastToRoom(String(roomId), {
		type: "userLeft",
		userId: userId,
	});

	return { success: true };
};

/*
 * ユーザのステータスを変更する
 */
export const updateReadyStatus = async (
	roomId: number,
	userId: number,
	isReady: boolean,
) => {
	return prisma.roomMember.update({
		where: {
			room_id_user_id: {
				room_id: roomId,
				user_id: userId,
			},
		},
		data: {
			is_ready: isReady,
		},
	});
};
