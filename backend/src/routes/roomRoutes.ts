import { FastifyInstance } from "fastify";
import {
	createRoom,
	getRoomDetails,
	updateRoomMemberRole,
	updateGameMode,
	updateRoomMemberReady,
	getRoomMembers,
	joinRoomByToken,
	leaveRoom,
	createRound,
	leaveResult,
} from "../controllers/roomController";

export async function roomRoutes(fastify: FastifyInstance) {
	fastify.post("/rooms", createRoom);
	fastify.get("/rooms/:roomId", getRoomDetails);
	fastify.patch(
		"/rooms/:roomId/members/:userId/ready",
		updateRoomMemberReady,
	);
	fastify.patch("/rooms/:roomId/members/:userId", updateRoomMemberRole);
	fastify.patch("/rooms/:roomId/game-mode", updateGameMode);
	fastify.get("/rooms/:roomId/members", getRoomMembers);
	fastify.post("/rooms/join", joinRoomByToken);
	fastify.post("/rooms/:roomId/leave", leaveRoom);
	fastify.post("/rooms/:roomId/round", createRound);
	fastify.post("/rooms/:roomId/leave-result", leaveResult);
}
