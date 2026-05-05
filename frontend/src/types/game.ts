import { GameMode } from "../types/room";

export const MAX_CHAT_LENGTH = 30;

export interface GameRoomMember {
	user_id: number;
	role: string;
	is_ready: boolean;
	score: number;
	user: { name: string };
}

export interface GameRoomRound {
	started_at: string | null;
	ended_time: string | null;
	drawer_id: number;
}

export interface GameDetails {
	game_mode: (typeof GameMode)[keyof typeof GameMode];
	members: GameRoomMember[];
	rounds: GameRoomRound[];
}
