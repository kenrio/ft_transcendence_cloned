import { apiClient } from "./apiClient";

export const gameApi = {
	getGameRoomDetails: async (roomId: number) => {
		return apiClient(`/rooms/${roomId}/game`, {
			method: "GET",
		});
	},
};
