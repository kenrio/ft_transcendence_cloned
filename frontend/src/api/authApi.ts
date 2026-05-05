import { apiClient } from "./apiClient";
import { type AuthUser } from "../types/user";

/**
 * ユーザー関連のAPI定義
 */
export const authApi = {
	// GET /api/me
	me: async (): Promise<AuthUser> => {
		return apiClient("/me", { credentials: "include" });
	},

	// POST /api/register
	register: async (data: {
		name: string;
		email: string;
		password: string;
	}) => {
		return apiClient("/register", {
			method: "POST",
			body: JSON.stringify(data),
			credentials: "include",
		});
	},

	// POST /api/login
	login: async (data: { email: string; password: string }) => {
		return apiClient("/login", {
			method: "POST",
			body: JSON.stringify(data),
			credentials: "include",
		});
	},

	// POST /api/logout
	logout: async () => {
		return apiClient("/logout", {
			method: "POST",
			body: JSON.stringify({}),
			credentials: "include",
		});
	},

	// PATCH /api/me
	updateMe: async (data: { name: string }): Promise<AuthUser> => {
		return apiClient("/me", {
			method: "PATCH",
			body: JSON.stringify(data),
			credentials: "include",
		});
	},
};
