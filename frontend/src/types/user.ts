export const GameRole = {
	PLAYER: "PLAYER",
	SPECTATOR: "SPECTATOR",
};

export const PlayerRole = {
	DRAWER: "DRAWER",
	GUESSER: "GUESSER",
};

export interface AuthUser {
	id: number;
	name: string;
	is_profile_complete: boolean;
	avatar: string;
}

export interface User {
	id: number;
	name: string;
	avatar: string;
	isReady: boolean;
	role: (typeof GameRole)[keyof typeof GameRole];
}
