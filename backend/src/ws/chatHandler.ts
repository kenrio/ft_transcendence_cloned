import { prisma } from "../lib/prisma";
import {
	addScore,
	getScores,
	broadcastToRoom,
	findClientByUserId,
	getRoundState,
	setRoundState,
} from "./roomManager";
import { RoomClient, WebSocketMessageType } from "../types/room/room";
import { selectRandomWord } from "./wordSelector";
import { MAX_CHAT_LENGTH } from "../types/game/chat";

export const handleChatMessage = async (client: RoomClient, data: any) => {
	console.log(
		`💬 Chat from ${client.userId} in room ${client.roomId}: ${data.text}`,
	);

	if (typeof data.text !== "string") {
		client.socket.send(
			JSON.stringify({
				type: WebSocketMessageType.ERROR,
				message: "Invalid message format",
			}),
		);
		return;
	}

	if (data.text.length > MAX_CHAT_LENGTH) {
		client.socket.send(
			JSON.stringify({
				type: WebSocketMessageType.ERROR,
				message: `Message too long (max ${MAX_CHAT_LENGTH} characters)`,
			}),
		);
		return;
	}

	if (client.role === "SPECTATOR") {
		client.socket.send(
			JSON.stringify({
				type: WebSocketMessageType.ERROR,
				message: "Spectators cannot send chat messages",
			}),
		);
		return;
	}

	try {
		const currentRound = getRoundState(client.roomId);

		if (!currentRound || !currentRound.word) {
			broadcastToRoom(client.roomId, {
				type: WebSocketMessageType.CHAT,
				id: data.id,
				sender: data.sender,
				text: data.text,
				timeStamp: data.timeStamp,
			});
			return;
		}

		if (client.userId === currentRound.drawerId) {
			broadcastToRoom(client.roomId, {
				type: WebSocketMessageType.CHAT,
				id: data.id,
				sender: data.sender,
				text: data.text,
				timestamp: data.timestamp,
			});
			return;
		}

		const isCorrect =
			data.text.trim().toLowerCase() ===
			currentRound.word.trim().toLowerCase();

		if (isCorrect) {
			// WebSocketで正解配信 + チャット送信
			broadcastToRoom(client.roomId, {
				type: WebSocketMessageType.CHAT,
				id: data.id,
				sender: data.sender,
				text: data.text,
				timestamp: data.timestamp,
			});

			// DB更新
			const newWord = selectRandomWord();
			const result = await prisma.round.updateMany({
				where: { id: currentRound.roundId, word: currentRound.word },
				data: { word: newWord },
			});
			if (result.count === 0) return;

			setRoundState(
				client.roomId,
				currentRound.roundId,
				newWord,
				currentRound.drawerId,
			);

			addScore(client.roomId, client.userId, 1);
			addScore(client.roomId, currentRound.drawerId, 1);

			// 正解通知
			broadcastToRoom(client.roomId, {
				type: WebSocketMessageType.CORRECT_ANSWER,
				userId: client.userId,
				sender: data.sender,
				word: currentRound.word,
				scores: Object.fromEntries(getScores(client.roomId)),
			});

			// Drawerにお題を送る
			const drawerClient = findClientByUserId(
				client.roomId,
				currentRound.drawerId,
			);

			drawerClient?.socket.send(
				JSON.stringify({
					type: WebSocketMessageType.NEXT_WORD,
					word: newWord,
				}),
			);
		} else {
			broadcastToRoom(client.roomId, {
				type: WebSocketMessageType.CHAT,
				id: data.id,
				sender: data.sender,
				text: data.text,
				timestamp: data.timestamp,
			});
		}
		return;
	} catch (error) {
		console.error("❌ Failed to handle chat message:", error);
		client.socket.send(
			JSON.stringify({
				type: WebSocketMessageType.ERROR,
				message: "Failed to process message",
			}),
		);
	}
};
