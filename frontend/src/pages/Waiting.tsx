import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { roomApi } from "../api/roomApi";
import { GameRole, type User } from "../types/user";
import {
	RoomStatus,
	GameMode,
	WebSocketMessageType,
	MIN_PLAYERS,
	MAX_MEMBERS,
	type RoomDetails,
	type RoomMember,
} from "../types/room";
import Toast from "../components/Toast";
import { Avatar } from "../components/Avatar";
import { avatarOrDefault } from "../constants/avatar";
import { LogoNavbar } from "../components/LogoNavbar";
import { createWebSocket } from "../api/wsClient";
import { ApiError } from "../api/apiClient";

const Waiting = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [users, setUsers] = useState<User[]>([]);
	const [gameMode, setGameMode] = useState(GameMode.DEFAULT);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastType, setToastType] = useState<"success" | "error">("success");
	const { id: roomId } = useParams();
	const [hostId, setHostId] = useState(0);
	const [isHost, setIsHost] = useState(false);
	const [invitationToken, setInvitationToken] = useState<string | null>(null);
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");
	const currentUserId = user?.id;
	const socketRef = useRef<WebSocket | null>(null);
	const leavingRef = useRef(false);
	const [joinedViaToken, setJoinedViaToken] = useState<boolean | null>(
		token ? null : true,
	);
	const hasJoinedRef = useRef(false);

	const getRoomDetails = useCallback(async () => {
		try {
			const res = (await roomApi.getRoomDetails(
				Number(roomId),
			)) as RoomDetails;

			if (res.status === RoomStatus.PLAYING) {
				navigate(`/game/${roomId}`);
				return;
			} else if (res.status === RoomStatus.RESULT) {
				navigate(`/result/${roomId}`);
				return;
			} else if (
				res.status === RoomStatus.WAITING &&
				res.rounds?.length > 0
			) {
				navigate(`/prepare/${roomId}`);
				return;
			}
			setIsHost(res.host_id === user?.id);
			setHostId(res.host_id);
			setGameMode(res.game_mode);
			const mappedUsers = res.members.map((member: RoomMember) => ({
				id: member.user.id,
				name: member.user.name,
				role: member.role,
				avatar: avatarOrDefault(member.user.avatar),
				isReady: member.is_ready,
			}));
			setUsers(mappedUsers);
			setInvitationToken(res.invitation_token ?? null);
		} catch (error) {
			if (
				error instanceof ApiError &&
				(error.status === 403 || error.status === 404)
			) {
				navigate("/");
				return;
			}
			console.log(error);
		}
	}, [roomId, user, navigate]);

	const getRoomDetailsRef = useRef(getRoomDetails);
	useEffect(() => {
		getRoomDetailsRef.current = getRoomDetails;
	}, [getRoomDetails]);

	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const isMountedRef = useRef(true);
	const reconnectAttemptRef = useRef(0);

	// 参加者一覧: 初回 + WebSocketイベント駆動（ポーリングなし）
	// 招待URLで参加する場合は joinRoomByToken 成功後にのみ WebSocket を接続
	useEffect(() => {
		if (!roomId || !user?.id) return;
		if (token && joinedViaToken !== true) return;

		isMountedRef.current = true;
		reconnectAttemptRef.current = 0;

		// 古いソケットの onclose でスケジュールされた再接続をキャンセル
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		const closedByCleanupRef = { current: false };

		const connect = () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			if (socketRef.current) {
				socketRef.current.close();
				socketRef.current = null;
			}
			closedByCleanupRef.current = false;
			const ws = createWebSocket();

			ws.onopen = () => {
				reconnectAttemptRef.current = 0;
				ws.send(
					JSON.stringify({
						type: WebSocketMessageType.JOIN,
						userId: Number(user.id),
						roomId: String(roomId),
					}),
				);
				getRoomDetailsRef.current();
			};

			ws.onmessage = event => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === "memberJoined") {
						getRoomDetailsRef.current();
					}
					if (data.type === WebSocketMessageType.LEFT) {
						getRoomDetailsRef.current();
						if (
							Number(data.userId) === user?.id &&
							leavingRef.current
						) {
							navigate("/");
						}
					}
					if (
						data.type === "memberRoleUpdated" &&
						data.userId != null &&
						data.role != null
					) {
						setUsers(prev =>
							prev.map(u =>
								u.id === Number(data.userId)
									? { ...u, role: data.role }
									: u,
							),
						);
					}
					if (data.type === "gameModeUpdated") {
						setGameMode(data.mode);
					}
					if (
						data.type === "navigateToPrepare" &&
						data.roomId != null
					) {
						navigate(`/prepare/${data.roomId}`);
					}
					if (
						data.type === WebSocketMessageType.ERROR &&
						data.message
					) {
						if (data.message === "Room has finished") {
							navigate("/");
							return;
						}
						setToastMessage(data.message);
						setToastType("error");
						setShowToast(true);
						setTimeout(() => setShowToast(false), 3000);
					}
				} catch (error) {
					console.error("Failed to parse WebSocket message:", error);
				}
			};

			ws.onerror = error => {
				if (closedByCleanupRef.current) return;
				if (ws.readyState !== WebSocket.OPEN) {
					console.warn(
						"WebSocket connection error (may retry):",
						error,
					);
				} else {
					console.error("WebSocket error:", error);
				}
			};

			ws.onclose = () => {
				if (closedByCleanupRef.current) return;
				if (!isMountedRef.current) return;
				// このソケットが既に置き換えられている場合は再接続しない
				if (socketRef.current !== ws) return;

				const MAX_RECONNECT_ATTEMPTS = 5;
				const attempt = reconnectAttemptRef.current;
				if (attempt >= MAX_RECONNECT_ATTEMPTS) return;

				reconnectAttemptRef.current += 1;
				const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectTimeoutRef.current = null;
					connect();
				}, delay);
			};

			socketRef.current = ws;
		};

		// 参加者をルームに追加後にWebSocketの通信を確立させ、最新の状態でフロントに反映する
		const startConnection = async () => {
			if (token) {
				if (hasJoinedRef.current) {
					connect();
					return;
				}
				hasJoinedRef.current = true;
				try {
					await roomApi.joinRoomByToken(token);
					getRoomDetailsRef.current();
					connect();
				} catch (error) {
					hasJoinedRef.current = false;
					console.error("Error:", error);
				}
			} else {
				connect();
			}
		};

		startConnection();

		return () => {
			isMountedRef.current = false;
			closedByCleanupRef.current = true;
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			if (socketRef.current) {
				socketRef.current.close();
				socketRef.current = null;
			}
		};
	}, [roomId, user?.id, navigate, token, joinedViaToken]);

	// URL招待で参加したメンバーをルームに追加する（成功後に WebSocket 接続可能になる）
	const joinInProgressRef = useRef(false);
	useEffect(() => {
		if (!token || !user?.id || !roomId) return;
		if (joinInProgressRef.current) return;
		joinInProgressRef.current = true;

		const doJoin = async () => {
			try {
				// 先にルーム状態を確認（FINISHED なら 403 で throw されるため join を呼ばずにリダイレクト）
				await roomApi.getRoomDetails(Number(roomId));
				await roomApi.joinRoomByToken(token);
				setJoinedViaToken(true);
				getRoomDetails();
			} catch (error: unknown) {
				if (
					error instanceof ApiError &&
					(error.status === 403 || error.status === 404)
				) {
					navigate("/");
					return;
				}
				const isExpectedError =
					error &&
					typeof error === "object" &&
					"status" in error &&
					(error as { status: number }).status === 400;
				if (!isExpectedError) {
					console.error("Error joining room:", error);
				}
				const msg =
					error &&
					typeof error === "object" &&
					"data" in error &&
					error.data &&
					typeof error.data === "object" &&
					("error" in error.data || "message" in error.data)
						? String(
								"error" in error.data
									? error.data.error
									: error.data.message,
							)
						: "ルームへの参加に失敗しました";
				setToastMessage(msg);
				setToastType("error");
				setShowToast(true);
				setJoinedViaToken(false);
				setTimeout(() => {
					setShowToast(false);
					navigate("/");
				}, 2500);
			} finally {
				joinInProgressRef.current = false;
			}
		};
		doJoin();
	}, [token, user?.id, roomId, getRoomDetails, navigate]);

	const toggleRole = async (id: number) => {
		// toggleするたびにAPIを叩く、そのプレイヤーのroleを変更する
		const targetUser = users.find(user => user.id === id);
		if (!targetUser) return;
		const newRole =
			targetUser.role === GameRole.PLAYER
				? GameRole.SPECTATOR
				: GameRole.PLAYER;
		const oldRole = targetUser.role;
		try {
			await roomApi.updateRoomMemberRole(Number(roomId), id, newRole);
			setUsers(prevUser =>
				prevUser.map(user =>
					user.id === id ? { ...user, role: newRole } : user,
				),
			);
		} catch (error: unknown) {
			setUsers(prevUser =>
				prevUser.map(user =>
					user.id === id ? { ...user, role: oldRole } : user,
				),
			);
			const msg =
				error &&
				typeof error === "object" &&
				"data" in error &&
				error.data &&
				typeof error.data === "object" &&
				("error" in error.data || "message" in error.data)
					? String(
							"error" in error.data
								? error.data.error
								: error.data.message,
						)
					: "ロールの変更に失敗しました";
			setToastMessage(msg);
			setToastType("error");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 3000);
		}
	};

	// ゲームモード変更 API叩く（hostのみ変更可能）
	const updateGameMode = async (mode: string) => {
		try {
			const res = await roomApi.updateGameMode(Number(roomId), mode);
			if (res && res.game_mode === mode) {
				setGameMode(res.game_mode);
			}
		} catch (error) {
			console.log(error);
		}
	};

	const playerCount = users.filter(u => u.role === GameRole.PLAYER).length;
	const memberCount = users.length;
	const canStartGame =
		playerCount >= MIN_PLAYERS && memberCount <= MAX_MEMBERS;
	const isPlayerFull = playerCount >= MAX_MEMBERS;
	const isRoomFull = memberCount >= MAX_MEMBERS;

	const copyToClipboard = () => {
		const url = invitationToken
			? `${window.location.origin}/waiting/${roomId}?token=${invitationToken}`
			: window.location.href;
		navigator.clipboard.writeText(url);
		setToastMessage("招待URLをコピーしました！");
		setToastType("success");
		setShowToast(true);
		setTimeout(() => setShowToast(false), 1500);
	};

	const handlePrepareClick = () => {
		const ws = socketRef.current;
		if (!isHost || !roomId || !ws || ws.readyState !== WebSocket.OPEN) {
			return;
		}
		if (!canStartGame) return;
		ws.send(
			JSON.stringify({ type: "prepareStarted", roomId: String(roomId) }),
		);
	};

	const handleLeaveRoom = () => {
		const ws = socketRef.current;
		if (!roomId || !user?.id) return;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			setToastMessage("接続を待っています...");
			setToastType("error");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 3000);
			return;
		}
		leavingRef.current = true;
		ws.send(
			JSON.stringify({
				type: WebSocketMessageType.LEAVE,
			}),
		);
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* トースト通知 */}
			{showToast && <Toast type={toastType} message={toastMessage} />}
			{/* Navbar */}
			<LogoNavbar />

			<div className="flex-1 flex flex-col items-center p-6">
				<div className="w-full max-w-3xl flex flex-col gap-6">
					{/* 参加者一覧セクション */}
					<div
						className="flex flex-col gap-4 p-6 rounded-lg"
						style={{ backgroundColor: "#fffde7" }}
					>
						<div className="flex items-center justify-between">
							<button
								onClick={handleLeaveRoom}
								className="px-4 py-2 rounded text-white text-base font-bold cursor-pointer"
								style={{ backgroundColor: "#6d4c41" }}
							>
								ルームを退出
							</button>
							<h2
								className="text-xl font-bold"
								style={{ color: "#6d4c41" }}
							>
								参加者一覧
							</h2>
						</div>
						<div
							className="flex gap-4 text-sm font-bold justify-end"
							style={{ color: "#6d4c41" }}
						>
							<span>観戦者</span>
							<span>プレイヤー</span>
						</div>
						<div className="flex flex-col gap-2">
							{users.map(member => (
								<div
									key={member.id}
									className="flex items-center justify-between px-3 py-3 rounded-md"
									style={{ backgroundColor: "#f4d59c" }}
								>
									<Avatar
										avatar={avatarOrDefault(member.avatar)}
										size="sm"
									/>
									<span
										className="font-bold"
										style={{ color: "#6d4c41" }}
									>
										{hostId === member.id ? <>👑 </> : ""}
										{member.name}
									</span>

									<div className="flex gap-4 w-32 justify-end">
										<input
											className="toggle border-indigo-600 bg-indigo-500 checked:border-orange-500 checked:bg-orange-400 checked:text-orange-800 cursor-pointer"
											type="checkbox"
											checked={
												member.role === GameRole.PLAYER
											}
											onChange={() =>
												toggleRole(member.id)
											}
											disabled={
												(!isHost &&
													member.id !==
														currentUserId) ||
												(member.role ===
													GameRole.SPECTATOR &&
													isPlayerFull)
											}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* 招待URLセクション */}
					<div
						className="flex flex-col gap-4 p-6 rounded-lg"
						style={{ backgroundColor: "#fffde7" }}
					>
						<h2
							className="text-xl font-bold"
							style={{ color: "#6d4c41" }}
						>
							招待URL
						</h2>
						{isRoomFull && (
							<p
								className="text-sm font-bold"
								style={{ color: "#d97706" }}
							>
								ルームの定員は8人までです
							</p>
						)}
						<button
							onClick={copyToClipboard}
							className="w-full py-3 rounded-lg text-base font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
							style={{ backgroundColor: "#4d8fff" }}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
								/>
							</svg>
							招待URLをコピー
						</button>
					</div>

					{/* ゲームモードセクション */}
					<div
						className="flex flex-col gap-4 p-6 rounded-lg"
						style={{ backgroundColor: "#fffde7" }}
					>
						<h2
							className="text-xl font-bold"
							style={{ color: "#6d4c41" }}
						>
							ゲームモード
						</h2>
						<div className="grid grid-cols-2 gap-4">
							<button
								onClick={() => updateGameMode(GameMode.DEFAULT)}
								disabled={!isHost}
								className="py-3 rounded-lg text-base font-bold cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
								style={{
									backgroundColor:
										gameMode === GameMode.DEFAULT
											? "#5bad55"
											: "#c8e6c9",
									color:
										gameMode === GameMode.DEFAULT
											? "#fff"
											: "#6d4c41",
								}}
							>
								デフォルト
							</button>
							<button
								onClick={() =>
									updateGameMode(GameMode.ONE_STROKE)
								}
								disabled={!isHost}
								className="py-3 rounded-lg text-base font-bold cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
								style={{
									backgroundColor:
										gameMode === GameMode.ONE_STROKE
											? "#5bad55"
											: "#c8e6c9",
									color:
										gameMode === GameMode.ONE_STROKE
											? "#fff"
											: "#6d4c41",
								}}
							>
								一筆書き
							</button>
						</div>
					</div>

					{/* ゲーム開始ボタン */}
					<div
						className="flex flex-col gap-4 p-6 rounded-lg"
						style={{ backgroundColor: "#fffde7" }}
					>
						{isHost && !canStartGame && (
							<p
								className="text-sm font-bold"
								style={{ color: "#d97706" }}
							>
								{`プレイヤーは${MIN_PLAYERS}人以上必要です`}
							</p>
						)}
						<button
							onClick={() =>
								isHost ? handlePrepareClick() : undefined
							}
							disabled={!isHost || !canStartGame}
							className="w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
							style={{
								backgroundColor: "#ffe066",
								color: "#6d4c41",
							}}
						>
							{isHost ? (
								"準備完了！"
							) : (
								<>
									<span className="loading loading-spinner loading-sm"></span>
									準備中
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Waiting;
