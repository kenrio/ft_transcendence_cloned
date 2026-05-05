import { FastifyInstance } from "fastify";
import {
	googleAuth,
	googleCallback,
} from "../controllers/auth/googleCallbackController";

export async function googleAuthRoutes(fastify: FastifyInstance) {
	fastify.get("/google/auth", googleAuth);
	fastify.get("/google/callback", googleCallback);
}
