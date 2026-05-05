import { FastifyRequest, FastifyReply } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import {
	GoogleAuthQuerystring,
	GoogleCallbackQuerystring,
	GoogleUserInfo,
	OAuthState,
} from "../../types/googleAuth";
import { handleGoogleLogin } from "./googleLoginController";
import { handleGoogleRegister } from "./googleRegisterController";

const FRONTEND_LOCAL = "http://localhost:5173";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const FRONTEND_URL_FALLBACK = process.env.FRONTEND_URL ?? FRONTEND_LOCAL;

/** リクエストからオリジンを取得（プロキシ経由時は x-forwarded-host を優先） */
const getOriginFromRequest = (request: FastifyRequest): string => {
	// 複数プロキシ経由時は "https,http" のようにカンマ区切りになるため、最初の値を使用
	const protoRaw = (request.headers["x-forwarded-proto"] as string) || "http";
	const proto = protoRaw.split(",")[0].trim();
	// プロキシ経由時は x-forwarded-host を優先（Vite proxy が Host を backend:3000 に書き換えるため）
	const hostRaw =
		(request.headers["x-forwarded-host"] as string) ||
		(request.headers.host ?? "localhost:3000");
	const host = hostRaw.split(",")[0].trim();
	return `${proto}://${host}`;
};

/** 許可するオリジンか検証（localhost / ngrok） */
const isAllowedOrigin = (origin: string): boolean => {
	try {
		const u = new URL(origin);
		if (u.hostname === "localhost" || u.hostname === "127.0.0.1")
			return true;
		if (u.hostname.endsWith(".ngrok-free.dev")) return true;
		return false;
	} catch {
		return false;
	}
};

export const googleAuth = async (
	request: FastifyRequest<{ Querystring: GoogleAuthQuerystring }>,
	reply: FastifyReply,
) => {
	try {
		const { mode } = request.query;
		if (mode !== "login" && mode !== "register") {
			return reply.code(400).send({
				message:
					"modeパラメータは login または register である必要があります",
			});
		}

		const origin = getOriginFromRequest(request);
		if (!isAllowedOrigin(origin)) {
			return reply
				.code(400)
				.send({ message: "許可されていないオリジンです" });
		}

		const redirectUri = `${origin}/v1/auth/google/callback`;
		const oauth2Client = new OAuth2Client(
			GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET,
			redirectUri,
		);

		const nonce = randomUUID();
		const oauthState: OAuthState = { nonce, mode };
		const stateStr = JSON.stringify(oauthState);

		const useSecure =
			process.env.NODE_ENV === "production" ||
			origin.startsWith("https://");
		reply.setCookie("oauth_state", stateStr, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: useSecure,
			maxAge: 60 * 10, // 10分
		});

		const authUrl = oauth2Client.generateAuthUrl({
			access_type: "online",
			scope: ["openid", "email", "profile"],
			state: stateStr,
		});

		return reply.redirect(authUrl);
	} catch (err) {
		request.log.error(err, "[googleAuth] エラー");
		const origin = getOriginFromRequest(request);
		const frontendUrl = getFrontendUrlForRedirect(origin);
		return reply.redirect(frontendUrl + "/login?error=server_error");
	}
};

const parseModeFromCookieState = (
	cookieStateRaw: string | undefined,
): "login" | "register" | null => {
	if (!cookieStateRaw) return null;
	try {
		const parsed = JSON.parse(cookieStateRaw) as OAuthState;
		if (parsed.mode === "login" || parsed.mode === "register") {
			return parsed.mode;
		}
		return null;
	} catch {
		return null;
	}
};

const exchangeCodeForUserInfo = async (
	code: string,
	redirectUri: string,
): Promise<GoogleUserInfo> => {
	const oauth2Client = new OAuth2Client(
		GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET,
		redirectUri,
	);
	const { tokens } = await oauth2Client.getToken(code);
	oauth2Client.setCredentials(tokens);

	const userInfoRes = await oauth2Client.request<GoogleUserInfo>({
		url: "https://www.googleapis.com/oauth2/v3/userinfo",
	});
	return userInfoRes.data;
};

/** リダイレクト先のフロントエンドURL。localhost:3000（バックエンド）のときは5173へ */
const getFrontendUrlForRedirect = (origin: string): string => {
	try {
		const u = new URL(origin);
		// localhost:3000 経由のときは常に localhost:5173 へ（FRONTEND_URL が ngrok でも優先）
		if (u.hostname === "localhost" && u.port === "3000") {
			return FRONTEND_LOCAL;
		}
	} catch {}
	return isAllowedOrigin(origin) ? origin : FRONTEND_URL_FALLBACK;
};

export const googleCallback = async (
	request: FastifyRequest<{ Querystring: GoogleCallbackQuerystring }>,
	reply: FastifyReply,
) => {
	const { code, error, state } = request.query;
	const origin = getOriginFromRequest(request);
	const frontendUrl = getFrontendUrlForRedirect(origin);
	const redirectUri = `${origin}/v1/auth/google/callback`;

	// CookieのstateからmodeをパースしてerrorBaseを決定
	const cookieStateRaw = request.cookies?.oauth_state;
	const mode = parseModeFromCookieState(cookieStateRaw);
	if (mode === null) {
		reply.setCookie("oauth_state", "", { maxAge: 0, path: "/" });
		return reply.redirect(frontendUrl + "/login?error=invalid_request");
	}
	const errorBase = `${frontendUrl}/${mode}`;

	// Googleからエラーが返された場合（ユーザーが認証を拒否した場合など）
	if (error) {
		reply.setCookie("oauth_state", "", { maxAge: 0, path: "/" });
		return reply.redirect(errorBase + "?error=invalid_request");
	}

	// state検証（CSRF対策）
	if (!state || !cookieStateRaw || state !== cookieStateRaw) {
		reply.setCookie("oauth_state", "", { maxAge: 0, path: "/" });
		return reply.redirect(errorBase + "?error=invalid_request");
	}

	// 使用済みstateを削除（再利用防止）
	reply.setCookie("oauth_state", "", { maxAge: 0, path: "/" });

	if (!code) {
		return reply.redirect(errorBase + "?error=invalid_request");
	}

	try {
		const userInfo = await exchangeCodeForUserInfo(code, redirectUri);
		if (!userInfo.email || !userInfo.email_verified) {
			return reply.redirect(errorBase + "?error=server_error");
		}
		// modeごとに処理
		if (mode === "login") {
			return await handleGoogleLogin(reply, userInfo, frontendUrl);
		} else if (mode === "register") {
			return await handleGoogleRegister(reply, userInfo, frontendUrl);
		} else {
			return reply.redirect(frontendUrl + "/login?error=invalid_request");
		}
	} catch (err) {
		console.error("[googleCallback] 予期しないエラー:", err);
		return reply.redirect(errorBase + "?error=server_error");
	}
};
