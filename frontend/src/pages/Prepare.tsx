import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { roomApi } from "../api/roomApi";
import { GameRole, PlayerRole, type User } from "../types/user";
import type { RoomDetails, RoomMember } from "../types/room";
import { createWebSocket } from "../api/wsClient";
import { ApiError } from "../api/apiClient";
import { WebSocketMessageType } from "../types/room";
import { Avatar } from "../components/Avatar";
import { avatarOrDefault } from "../constants/avatar";
import { LogoNavbar } from "../components/LogoNavbar";

const Prepare = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { id: paramRoomId } = useParams();
	const roomId = paramRoomId !== undefined ? Number(paramRoomId) : undefined;
	const [isReady, setIsReady] = useState<boolean>(false);
	const [spectatorCount, setSpectatorCount] = useState<number>(0);
	const [players, setPlayers] = useState<User[]>([]);
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const count: number = 3;
	const [countdown, setCountdown] = useState<number | null>(null);
	const [countdownStarted, setCountdownStarted] = useState(false);
	const [currentDrawer, setCurrentDrawer] = useState<User | null>(null);
	const [roundNumber, setRoundNumber] = useState(1);
	const [myRole, setMyRole] = useState<
		(typeof GameRole)[keyof typeof GameRole] | null
	>(null);
	const role =
		user?.id !== undefined &&
		currentDrawer?.id !== undefined &&
		Number(currentDrawer.id) === Number(user?.id)
			? PlayerRole.DRAWER
			: PlayerRole.GUESSER;

	// WebSocketの作成
	useEffect(() => {
		if (roomId === undefined || user?.id === undefined) return;
		const closedByCleanup = { current: false };
		const ws = createWebSocket();

		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					type: "join",
					userId: Number(user.id),
					roomId: String(roomId),
				}),
			);
		};

		ws.onmessage = event => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "updateReady") {
					setPlayers(prev =>
						prev.map(p =>
							p.id === Number(data.userId)
								? { ...p, isReady: data.isReady }
								: p,
						),
					);
					if (Number(data.userId) === Number(user?.id)) {
						setIsReady(data.isReady);
					}
				}
				if (
					data.type === WebSocketMessageType.ERROR &&
					data.message === "Room has finished"
				) {
					navigate("/");
				}
			} catch (error) {
				console.error("Failed to parse message:", error);
			}
		};

		ws.onerror = error => {
			if (!closedByCleanup.current) {
				console.error("Websocket error:", error);
			}
		};

		ws.onclose = () => {
			if (!closedByCleanup.current) {
				console.log("Websocket disconnected");
			}
		};

		queueMicrotask(() => setSocket(ws));

		return () => {
			closedByCleanup.current = true;
			ws.close();
			setSocket(null);
		};
	}, [roomId, user?.id, navigate]);

	useEffect(() => {
		if (countdown === null || !countdownStarted) {
			return;
		}
		if (countdown < 0) {
			const redirectTimer = setTimeout(() => {
				navigate(`/game/${roomId}`);
			}, 1500);
			return () => clearTimeout(redirectTimer);
		}

		const timer = setInterval(() => {
			setCountdown(prev => (prev !== null ? prev - 1 : null));
		}, 1000);
		return () => clearInterval(timer);
	}, [countdown, countdownStarted, navigate, roomId]);

	useEffect(() => {
		if (countdownStarted || players.length === 0) {
			return;
		}
		const allReady = players.every(p => p.isReady);
		if (allReady) {
			queueMicrotask(() => {
				setCountdownStarted(true);
				setCountdown(count);
			});
		}
	}, [players, countdownStarted, count]);

	const toggleIsReady = () => {
		if (roomId === undefined || user?.id === undefined) return;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			console.error("Websocket not connected");
			return;
		}
		const nextReady = !isReady;
		setIsReady(nextReady);
		socket.send(
			JSON.stringify({ type: "updateReady", isReady: nextReady }),
		);
	};

	// Roundの作成
	useEffect(() => {
		if (roomId === undefined || user?.id === undefined) return;
		const ensureRound = async () => {
			try {
				const round = await roomApi.createRound(roomId);
				if (round?.drawer) {
					setCurrentDrawer({
						id: round.drawer.id,
						name: round.drawer.name,
						avatar: avatarOrDefault(round.drawer.avatar),
						role: GameRole.PLAYER,
						isReady: false,
					});
				}
				const roomDetails = (await roomApi.getRoomDetails(
					roomId,
				)) as RoomDetails;
				const members = roomDetails?.members ?? [];
				setRoundNumber(roomDetails?.rounds?.length ?? 1);
				const spectatorCount = members.filter(
					(m: RoomMember) => m.role === GameRole.SPECTATOR,
				).length;
				setSpectatorCount(spectatorCount);
				const playerMembers = members.filter(
					(m: RoomMember) => m.role === GameRole.PLAYER,
				);
				setPlayers(
					playerMembers.map(m => ({
						id: m.user_id,
						name: m.user.name,
						role: m.role,
						avatar: avatarOrDefault(m.user.avatar),
						isReady: m.is_ready,
					})),
				);
				const myStatus = members.find(
					(m: { user: { id: number } }) => m.user.id === user?.id,
				);
				setMyRole(myStatus?.role ?? null);
				setIsReady(myStatus?.is_ready ?? false);
				setCountdownStarted(false);
				setCountdown(null);
			} catch (error) {
				if (
					error instanceof ApiError &&
					(error.status === 403 || error.status === 404)
				) {
					navigate("/");
					return;
				}
				console.error("Failed to create round:", error);
			}
		};
		ensureRound();
	}, [roomId, user?.id, navigate]);

	return (
		<div
			className="min-h-screen flex flex-col"
			style={{ backgroundColor: "#87ceeb" }}
		>
			<LogoNavbar />

			<div className="flex-1 flex flex-col items-center p-6">
				<div className="w-full max-w-3xl flex flex-col gap-6">
					{/* ヘッダー */}
					<div className="text-center space-y-1">
						<h1
							className="text-3xl font-black"
							style={{ color: "#6d4c41" }}
						>
							Round {roundNumber}
						</h1>
						<p className="text-sm" style={{ color: "#9e7b6a" }}>
							まもなく開始します
						</p>
					</div>
					<div className="flex flex-col sm:flex-row flex-nowrap justify-center gap-6 w-full">
						{/* 今回の描き手 */}
						<div
							className="flex-1 min-w-0 rounded-lg p-6 flex flex-col gap-3"
							style={{ backgroundColor: "#fffde7" }}
						>
							<p
								className="text-sm font-bold"
								style={{ color: "#5bad55" }}
							>
								今回の描き手
							</p>
							<div className="flex items-center justify-center gap-4">
								<Avatar
									avatar={avatarOrDefault(
										currentDrawer?.avatar,
									)}
									size="md"
								/>
								<p
									className="text-2xl font-bold"
									style={{ color: "#6d4c41" }}
								>
									{currentDrawer?.name ?? "NAME"}
								</p>
							</div>
						</div>

						{/* あなたの役割 */}
						<div
							className="flex-1 min-w-0 rounded-lg p-6 flex flex-col gap-4"
							style={{ backgroundColor: "#fffde7" }}
						>
							<p
								className="text-sm font-bold"
								style={{ color: "#5bad55" }}
							>
								あなたの役割
							</p>
							<div className="flex items-center justify-between">
								<span
									className="text-2xl font-black"
									style={{ color: "#6d4c41" }}
								>
									{myRole === GameRole.SPECTATOR
										? "観戦者"
										: role === PlayerRole.DRAWER
											? "描き手"
											: "回答者"}
								</span>
								{myRole !== GameRole.SPECTATOR && (
									<button
										className={`px-6 py-2 rounded-xl border-3 font-bold text-sm cursor-pointer transition-opacity active:scale-[0.97] ${
											isReady
												? "hover:bg-[#4e9b49]!"
												: "hover:bg-[#e04a3f]!"
										}`}
										style={{
											backgroundColor: isReady
												? "#5bad55"
												: "#FF5447",
											color: "#fff",
										}}
										disabled={countdownStarted}
										onClick={() =>
											!countdownStarted && toggleIsReady()
										}
									>
										{isReady === true
											? "準備完了"
											: "準備中"}
									</button>
								)}
							</div>
						</div>
					</div>

					{/* プレイヤーの準備状況 */}
					<div
						className="rounded-lg p-6 flex flex-col gap-3"
						style={{ backgroundColor: "#fffde7" }}
					>
						<p
							className="text-sm font-bold"
							style={{ color: "#5bad55" }}
						>
							プレイヤーの準備状況 (観戦：{spectatorCount}人)
						</p>
						<div className="flex flex-col gap-2">
							{players.map(player => (
								<div
									key={player.id}
									className="flex items-center justify-between px-3 py-3 rounded-md"
									style={{ backgroundColor: "#f4d59c" }}
								>
									<div className="flex items-center gap-3">
										<Avatar
											avatar={avatarOrDefault(
												player?.avatar,
											)}
											size="sm"
										/>
										<span
											className="font-semibold"
											style={{ color: "#6d4c41" }}
										>
											{player.name}
										</span>
									</div>
									{player.isReady ? (
										<span
											className="flex items-center gap-1 text-sm font-bold"
											style={{ color: "#5bad55" }}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
											準備完了!
										</span>
									) : (
										<span
											className="flex items-center gap-2 text-sm font-bold"
											style={{ color: "#FF5447" }}
										>
											<span className="loading loading-spinner loading-xs"></span>
											準備中
										</span>
									)}
								</div>
							))}
						</div>
					</div>

					{/* カウントダウン */}
					<div className="flex flex-col items-center py-4">
						{countdown === null ? (
							<p
								className="text-xl font-black"
								style={{ color: "#6d4c41" }}
							>
								プレイヤーを待っています...
							</p>
						) : countdown >= 0 ? (
							<>
								<span
									className="countdown font-mono text-9xl"
									style={{ color: "#6d4c41" }}
								>
									<span
										style={
											{
												"--value": countdown,
											} as React.CSSProperties
										}
									></span>
								</span>
								<div className="mt-4 flex gap-2 justify-center">
									{[...Array(count)].map((_, i) => (
										<div
											key={i}
											className="w-3 h-3 rounded-full transition-all duration-500"
											style={{
												backgroundColor: "#5bad55",
												opacity:
													count - i <= countdown
														? 1
														: 0.2,
											}}
										></div>
									))}
								</div>
							</>
						) : (
							<span
								className="text-5xl font-black"
								style={{ color: "#5bad55" }}
							>
								GAME START!
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Prepare;
