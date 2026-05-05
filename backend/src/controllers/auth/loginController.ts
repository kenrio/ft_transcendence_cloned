import { FastifyRequest, FastifyReply } from "fastify";
import { LoginRequest, LoginRoute } from "../../types/auth/login";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import { createSessionAndSetCookie } from "../../lib/login";

export const login = async (
	request: FastifyRequest<LoginRoute>,
	reply: FastifyReply<LoginRoute>,
) => {
	const parsed = LoginRequest.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			message: "入力に不備があります。",
		});
	}
	const { email, password } = parsed.data;

	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				password: true,
			},
		});

		if (!user || user.password === null) {
			return reply.code(401).send({
				message: "メールアドレスまたはパスワードが正しくありません",
			});
		}

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) {
			return reply.code(401).send({
				message: "メールアドレスまたはパスワードが正しくありません",
			});
		}

		const successResponse = await createSessionAndSetCookie(reply, user.id);
		return reply.code(201).send(successResponse);
	} catch (err) {
		request.log?.error?.(err);
		return reply.code(500).send({
			message:
				"予期しないエラーが発生しました。時間をおいて再度お試しください",
		});
	}
};
