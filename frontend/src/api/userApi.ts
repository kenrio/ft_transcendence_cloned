import { apiClient } from "./apiClient";

/**
 * ユーザー関連のAPI定義
 */
export const userApi = {
	// GET /api/users
	getUsers: async () => {
		return apiClient("/users");
	},

	// GET /api/profile
	getProfile: async () => {
		return apiClient("/profile", { credentials: "include" });
	},

	// POST /api/userbadge
	updateUserBadge: async () => {
		return apiClient("/userbadge", {
			method: "POST",
			body: JSON.stringify({}),
			credentials: "include",
		});
	},
};
