import { FastifyInstance } from "fastify";
import { registerUser } from "../controllers/auth/registerController";
import { login } from "../controllers/auth/loginController";
import { me } from "../controllers/auth/meController";
import { logout } from "../controllers/auth/logoutController";
import { updateMe } from "../controllers/auth/updateMeController";

export async function authRoutes(fastify: FastifyInstance) {
	fastify.post("/register", registerUser);
	fastify.post("/login", login);
	fastify.post("/logout", logout);
	fastify.get("/me", me);
	fastify.patch("/me", updateMe);
}
