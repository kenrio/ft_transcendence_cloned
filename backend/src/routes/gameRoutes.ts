import { FastifyInstance } from "fastify";
import { getGameRoomDetails } from "../controllers/gameController";

export async function gameRoutes(fastify: FastifyInstance) {
	fastify.get("/rooms/:roomId/game", getGameRoomDetails);
}
