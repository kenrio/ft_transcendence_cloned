import { GameRole, type User } from "./user";

export const RoomStatus = {
	WAITING: "WAITING",
	PLAYING: "PLAYING",
	RESULT: "RESULT",
	FINISHED: "FINISHED",
};

export const GameMode = {
	DEFAULT: "DEFAULT",
	ONE_STROKE: "ONE_STROKE",
};

export interface RoomMember {
	room_id: number;
	user_id: number;
	is_ready: boolean;
	role: (typeof GameRole)[keyof typeof GameRole];
	user: User;
}

export interface Round {
	id: number;
	room_id: number;
	drawer_id: number;
	word: string | null;
	winner_id: number | null;
	started_at: string | null;
	ended_time: string | null;
}

export interface RoomDetails {
	id: number;
	game_mode: (typeof GameMode)[keyof typeof GameMode];
	host_id: number;
	invitation_token?: string;
	status: (typeof RoomStatus)[keyof typeof RoomStatus];
	members: RoomMember[];
	rounds: Round[];
}

/**
 * プレイヤー数制限
 */
export const MIN_PLAYERS = 2;

/**
 * ルーム全体の定員（プレイヤー+観戦者の合計）
 */
export const MAX_MEMBERS = 8;

/**
 * ラウンドタイマー用の定数
 */
export const ROUND_DURATION = 60;
/**
 * WebSocketメッセージタイプ
 */
export const WebSocketMessageType = {
	JOIN: "join",
	LEAVE: "leave",
	LEFT: "userLeft",
	CHAT: "chat",
	DRAW: "draw",
	DRAW_END: "drawEnd",
	CURRENT_SCORES: "currentScores",
	CLEAR: "clear",
	NAVIGATE_TO_PREPARE: "navigateToPrepare",
	PREPARE_STARTED: "prepareStarted",
	ROUND_START: "roundStart",
	ROUND_STARTED: "roundStarted",
	ROUND_END: "roundEnd",
	TIMER: "timer",
	CORRECT_ANSWER: "correctAnswer",
	NEXT_WORD: "nextWord",
	SKIP: "skip",
	SKIPPED: "skipped",
	REMATCH_CREATED: "rematchCreated",
	ERROR: "error",
};

export interface Player {
	id: number;
	name: string;
	score: number;
	isDrawing: boolean;
}
