import { WebSocket } from "ws";
import { prisma } from "../lib/prisma";
import {
	RoomClient,
	WebSocketMessageType,
	ROUND_DURATION,
	MIN_PLAYERS,
} from "../types/room/room";
import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PEN_LINE_WIDTH,
	ERASER_LINE_WIDTH,
} from "../types/game/canvas";
import {
	joinRoom,
	leaveRoom,
	broadcastToRoom,
	findClientByUserId,
	setRoundState,
	initScores,
	addScore,
	getScores,
	getRoundState,
	isClientRegistered,
} from "./roomManager";
import { leaveRoomMember } from "../services/roomService";
import { handleChatMessage } from "./chatHandler";
import { isTimerRunning, startTimer } from "./timerManager";
import { selectRandomWord } from "./wordSelector";
import { updateReadyStatus } from "../services/roomService";
import { RoomStatus, UserRole } from "../generated/prisma/enums";

export const handleConnection = (socket: WebSocket) => {
	let currentClient: RoomClient | null = null;

	console.log("✅ Client connected");

	socket.on("message", async rawMessage => {
		try {
			const data = JSON.parse(rawMessage.toString());
			console.log("📥 Received: ", data);

			if (data.type === WebSocketMessageType.JOIN) {
				if (!data.userId || typeof data.userId !== "number") {
					console.log("❌ Invalid userId:", data.userId);
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Invalid userId",
						}),
					);
					return;
				}

				if (
					!data.roomId ||
					typeof data.roomId !== "string" ||
					data.roomId.trim() === ""
				) {
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Invalid roomId",
						}),
					);
					return;
				}

				if (currentClient) {
					leaveRoom(currentClient);
				}

				const room = await prisma.room.findUnique({
					where: { id: Number(data.roomId) },
					select: { status: true },
				});
				if (room?.status === RoomStatus.FINISHED) {
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Room has finished",
						}),
					);
					return;
				}

				const member = await prisma.roomMember.findFirst({
					where: {
						room_id: Number(data.roomId),
						user_id: data.userId,
					},
				});

				if (!member) {
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Not a member of this room",
						}),
					);
					return;
				}

				currentClient = {
					socket,
					userId: data.userId,
					roomId: data.roomId,
					role: member.role,
				};

				joinRoom(currentClient);

				const activeRound = await prisma.round.findFirst({
					where: {
						room_id: Number(data.roomId),
						started_at: { not: null },
						ended_time: null,
					},
				});

				if (activeRound && activeRound.word) {
					setRoundState(
						data.roomId,
						activeRound.id,
						activeRound.word,
						activeRound.drawer_id,
					);
				}

				if (data.userId === activeRound?.drawer_id) {
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.NEXT_WORD,
							word: activeRound?.word,
						}),
					);
				}

				const scores = getScores(data.roomId);
				if (scores.size > 0) {
					console.log("Send CURRENT_SCORES");
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.CURRENT_SCORES,
							scores: Object.fromEntries(scores),
						}),
					);
				}

				return;
			}

			if (!currentClient) {
				console.error("❌ Not joined to any room");
				socket.send(
					JSON.stringify({
						type: WebSocketMessageType.ERROR,
						message: "Join a room first",
					}),
				);

				return;
			} else if (data.type === WebSocketMessageType.LEAVE) {
				try {
					const roomId = Number(currentClient.roomId);
					const userId = currentClient.userId;

					const result = await leaveRoomMember(roomId, userId);

					if (!result.success) {
						socket.send(
							JSON.stringify({
								type: WebSocketMessageType.ERROR,
								message: result.error,
							}),
						);
						return;
					}

					leaveRoom(currentClient);
					currentClient = null;
				} catch (error) {
					console.error("Error leaving room:", error);
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Failed to leave room",
						}),
					);
				}
			} else if (data.type === WebSocketMessageType.UPDATE_READY) {
				if (typeof data.isReady !== "boolean") return;
				try {
					await updateReadyStatus(
						Number(currentClient.roomId),
						Number(currentClient.userId),
						data.isReady,
					);
					broadcastToRoom(currentClient.roomId, {
						type: WebSocketMessageType.UPDATE_READY,
						userId: currentClient.userId,
						isReady: data.isReady,
					});
				} catch (error) {
					console.error("Error:", error);
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: "Failed to update ready",
						}),
					);
				}
			} else if (data.type === WebSocketMessageType.PREPARE_STARTED) {
				const room = await prisma.room.findUnique({
					where: { id: Number(currentClient.roomId) },
					include: {
						members: {
							where: { role: UserRole.PLAYER },
						},
					},
				});
				if (!room || room.host_id !== Number(currentClient.userId)) {
					return;
				}
				if (room.members.length < MIN_PLAYERS) {
					socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ERROR,
							message: `プレイヤーは${MIN_PLAYERS}人以上必要です。`,
						}),
					);
					return;
				}
				broadcastToRoom(String(currentClient.roomId), {
					type: WebSocketMessageType.NAVIGATE_TO_PREPARE,
					roomId: currentClient.roomId,
				});
			} else if (data.type === WebSocketMessageType.CHAT) {
				await handleChatMessage(currentClient, data);
			} else if (data.type === WebSocketMessageType.DRAW) {
				if (
					typeof data.x !== "number" ||
					typeof data.y !== "number" ||
					typeof data.color !== "string" ||
					typeof data.lineWidth !== "number"
				) {
					console.log("❌ Invalid draw message");
					return;
				}

				const x = Math.max(0, Math.min(CANVAS_WIDTH, data.x));
				const y = Math.max(0, Math.min(CANVAS_HEIGHT, data.y));

				const lineWidth =
					data.lineWidth === ERASER_LINE_WIDTH
						? ERASER_LINE_WIDTH
						: PEN_LINE_WIDTH;

				broadcastToRoom(
					currentClient.roomId,
					{
						type: WebSocketMessageType.DRAW,
						x: x,
						y: y,
						color: data.color,
						lineWidth: lineWidth,
						isStart: data.isStart,
					},
					socket,
				);
			} else if (data.type === WebSocketMessageType.DRAW_END) {
				broadcastToRoom(
					currentClient.roomId,
					{
						type: WebSocketMessageType.DRAW_END,
					},
					socket,
				);
			} else if (data.type === WebSocketMessageType.CLEAR) {
				broadcastToRoom(
					currentClient.roomId,
					{
						type: WebSocketMessageType.CLEAR,
					},
					socket,
				);
			} else if (data.type === WebSocketMessageType.ROUND_START) {
				if (!currentClient) {
					console.log("❌ Not joined to any room");
					return;
				}

				if (isTimerRunning(currentClient.roomId)) {
					console.log(
						`⚠️ Timer already running in room ${currentClient.roomId}`,
					);
					return;
				}

				try {
					const room = await prisma.room.findUnique({
						where: { id: Number(currentClient.roomId) },
						include: {
							members: true,
							rounds: {
								where: { started_at: null, ended_time: null },
								take: 1,
							},
						},
					});

					if (!room) {
						console.log(
							`❌ Room ${currentClient.roomId} not found`,
						);
						return;
					}

					const players = room.members.filter(
						m => m.role === UserRole.PLAYER,
					);
					if (players.length < MIN_PLAYERS) {
						socket.send(
							JSON.stringify({
								type: WebSocketMessageType.ERROR,
								message: `プレイヤーは${MIN_PLAYERS}人以上必要です。`,
							}),
						);
						return;
					}

					const allReady = players.every(m => m.is_ready);
					if (!allReady) {
						console.log(
							`⚠️ Not all members ready in room ${currentClient.roomId}`,
						);
						return;
					}

					const currentRound = room.rounds[0];
					if (!currentRound) {
						console.log(
							`❌ No round found in room ${currentClient.roomId}`,
						);
						return;
					}

					const word = selectRandomWord();

					const result = await prisma.round.updateMany({
						where: { id: currentRound.id, started_at: null },
						data: {
							word: word,
							started_at: new Date(),
						},
					});

					if (result.count === 0) {
						console.log("⚠️ Round already started");
						return;
					}

					setRoundState(
						currentClient.roomId,
						currentRound.id,
						word,
						currentRound.drawer_id,
					);

					initScores(currentClient.roomId);

					const drawerClient = findClientByUserId(
						currentClient.roomId,
						currentRound.drawer_id,
					);

					await prisma.room.update({
						where: { id: Number(currentClient.roomId) },
						data: { status: "PLAYING" },
					});

					drawerClient?.socket.send(
						JSON.stringify({
							type: WebSocketMessageType.ROUND_STARTED,
							roundId: currentRound.id,
							drawerId: currentRound.drawer_id,
							word: word,
						}),
					);

					broadcastToRoom(
						currentClient.roomId,
						{
							type: WebSocketMessageType.ROUND_STARTED,
							roundId: currentRound.id,
							drawerId: currentRound.drawer_id,
							word: null,
						},
						drawerClient?.socket,
					);

					startTimer(currentClient.roomId, ROUND_DURATION);
				} catch (error) {
					console.error(`❌ Failed to start round:`, error);
				}
			} else if (data.type === WebSocketMessageType.SKIP) {
				if (!currentClient) {
					console.log("❌ Not joined to any room");
					return;
				}

				const currentRound = getRoundState(currentClient.roomId);
				if (!currentRound) return;

				if (currentClient.userId !== currentRound.drawerId) {
					console.log("❌ Invalid sender");
					return;
				}

				const word = selectRandomWord();

				const result = await prisma.round.updateMany({
					where: {
						id: currentRound.roundId,
						word: currentRound.word,
					},
					data: {
						word: word,
					},
				});
				if (result.count === 0) return;

				addScore(currentClient.roomId, currentRound.drawerId, -1);

				setRoundState(
					currentClient.roomId,
					currentRound.roundId,
					word,
					currentRound.drawerId,
				);

				broadcastToRoom(currentClient.roomId, {
					type: WebSocketMessageType.SKIPPED,
					scores: Object.fromEntries(getScores(currentClient.roomId)),
				});

				const drawerClient = findClientByUserId(
					currentClient.roomId,
					currentRound.drawerId,
				);

				drawerClient?.socket.send(
					JSON.stringify({
						type: WebSocketMessageType.NEXT_WORD,
						word: word,
					}),
				);
			} else if (data.type === WebSocketMessageType.REMATCH_CREATED) {
				broadcastToRoom(
					currentClient.roomId,
					{
						type: WebSocketMessageType.REMATCH_CREATED,
						newRoomId: data.newRoomId,
						token: data.token,
					},
					socket,
				);
			}
		} catch (error) {
			console.error("❌ Invalid message: ", error);
		}
	});

	socket.on("close", () => {
		if (currentClient) {
			if (isClientRegistered(currentClient.roomId, socket)) {
				broadcastToRoom(currentClient.roomId, {
					type: WebSocketMessageType.LEFT,
					userId: currentClient.userId,
				});
				leaveRoom(currentClient);
			}
		}
		console.log("🔌 Client disconnected");
	});
};
