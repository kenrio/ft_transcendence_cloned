import { FastifyInstance } from "fastify";
import {
	getHello,
	getUsers,
	getProfile,
	updateUserbadge,
} from "../controllers/userController";

export async function userRoutes(fastify: FastifyInstance) {
	// 個別のルート定義
	fastify.get("/hello", getHello);
	fastify.get("/users", getUsers);
	fastify.get("/profile", getProfile);
	fastify.post("/userbadge", updateUserbadge);

	// 他のHTTPメソッドも同様に定義可能
	// fastify.post('/users', createUser);
}
