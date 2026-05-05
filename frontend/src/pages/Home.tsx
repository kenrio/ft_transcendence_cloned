import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { roomApi } from "../api/roomApi";
import Footer from "../components/footer/Footer";
import { Avatar } from "../components/Avatar";
import { avatarOrDefault } from "../constants/avatar";
import { LogoNavbar } from "../components/LogoNavbar";

function Home() {
	const navigate = useNavigate();
	const { isAuthenticated, user, logout } = useAuth();

	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	const handleCreateRoom = async () => {
		if (!isAuthenticated || !user) return;
		try {
			const room = await roomApi.createRoom(user.id);
			if (!room) throw new Error("Room cannot be created");
			navigate(`/waiting/${room.id}`);
		} catch (error) {
			console.error("Error:", error);
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* Navbar */}
			<LogoNavbar
				linkToHome
				rightSlot={
					<button
						onClick={handleLogout}
						className="px-3 py-2 rounded text-sm font-bold text-white"
						style={{ backgroundColor: "#6d4c41" }}
					>
						ログアウト
					</button>
				}
			/>

			{/* Main Content */}
			<div className="flex-1 flex flex-col items-center justify-center p-6">
				<div className="w-full max-w-3xl flex flex-col gap-6 items-center">
					{/* User Info Card */}
					<div
						className="w-full rounded-lg p-8 flex flex-col items-center gap-4"
						style={{ backgroundColor: "#fffde7" }}
					>
						<p
							className="text-base font-bold tracking-widest uppercase"
							style={{ color: "#5bad55" }}
						>
							ログイン中のユーザー
						</p>
						<div className="flex items-center gap-6">
							<div
								className="w-20 h-20 rounded-full flex items-center justify-center border-2 overflow-hidden"
								style={{
									backgroundColor: "#ffd518",
									borderColor: "#ffa600",
								}}
							>
								<Avatar
									avatar={avatarOrDefault(user?.avatar)}
									size="lg"
									className="w-full h-full"
								/>
							</div>
							<p
								className="text-3xl font-bold"
								style={{ color: "#6d4c41" }}
							>
								{user?.name ?? "ゲスト"}
							</p>
						</div>
						<Link
							to="/profile"
							className="px-6 py-2 rounded-lg text-base font-bold bg-[#5bad55] text-white transition-colors hover:bg-[#4e9b49]"
						>
							プロフィール
						</Link>
					</div>

					{/* Game Rules */}
					<div
						className="w-full rounded-lg p-8 flex flex-col items-center gap-4"
						style={{ backgroundColor: "#fffde7" }}
					>
						<p
							className="text-xl font-bold"
							style={{ color: "#5bad55" }}
						>
							ゲームのルール
						</p>
						<div
							className="text-base text-center space-y-2"
							style={{ color: "#6d4c41" }}
						>
							<p>
								このゲームは、
								<span
									className="font-bold"
									style={{ color: "#5bad55" }}
								>
									2人以上
								</span>
								で遊べます。
							</p>
							<p>描き手がお題の絵を描きます。</p>
							<p>他の人は、絵だけを見てお題が何かを当てます。</p>
							<p>
								正解すると、
								<span
									className="font-bold"
									style={{ color: "#5bad55" }}
								>
									絵を描いた人
								</span>
								と
								<span
									className="font-bold"
									style={{ color: "#5bad55" }}
								>
									当てた人
								</span>
								に点数が入ります。
							</p>
							<p>
								最終的な点数が高い人が勝ちです。みんなでワイワイ盛り上がりながら遊びましょう！
							</p>
						</div>
					</div>

					{/* CTA Button */}
					<button
						onClick={handleCreateRoom}
						className="px-16 py-4 rounded-xl bg-[#ffbf47] text-[#6d4c41] font-bold text-xl tracking-wider cursor-pointer transition-colors duration-200 hover:bg-[#ffa726] active:scale-[0.97] focus:outline-none"
					>
						ルームを作成する
					</button>
				</div>
			</div>

			<Footer />
		</div>
	);
}

export default Home;
