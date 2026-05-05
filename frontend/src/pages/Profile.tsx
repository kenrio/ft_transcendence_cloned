import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../api/userApi";
import { useAuth } from "../features/auth/useAuth";
import Footer from "../components/footer/Footer";
import { LogoNavbar } from "../components/LogoNavbar";
import { type profileData } from "../types/profile";
import { BadgeImage } from "../components/profile/badges";
import { Avatar } from "../components/Avatar";
import { avatarOrDefault } from "../constants/avatar";

const Profile = () => {
	const navigate = useNavigate();
	const { logout } = useAuth();

	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	// 1ユーザのデータがそのまま帰ってくる
	const [profileData, setProfileData] = useState<profileData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const data = await userApi.getProfile();
				setProfileData(data);
			} catch (error) {
				console.error("データの取得に失敗しました", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchProfile();
	}, []);

	if (isLoading) {
		return <div className="p-10">読み込み中...</div>;
	}
	if (!profileData) {
		return <div className="p-10">データを表示できません</div>;
	}

	return (
		<div className="min-h-screen flex flex-col">
			{/* Navbar */}
			<LogoNavbar
				linkToHome
				leftSlot={
					<Link
						to="/"
						className="inline-flex items-center px-3 py-2 rounded text-sm font-bold cursor-pointer text-white bg-[#4d8fff] hover:bg-[#3277EC] transition-colors"
					>
						◀︎ ホーム
					</Link>
				}
				rightSlot={
					<button
						onClick={handleLogout}
						className="px-3 py-2 rounded text-sm font-bold text-white bg-[#6d4c41] hover:bg-[#5d4037] cursor-pointer transition-colors"
					>
						ログアウト
					</button>
				}
			/>

			<div className="flex-1 flex flex-col items-center justify-center p-6">
				<div className="w-full max-w-3xl flex flex-col gap-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<h1
							className="text-3xl sm:text-4xl font-bold"
							style={{ color: "#5bad55" }}
						>
							プロフィール
						</h1>
					</div>

					<div className="space-y-6">
						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row items-stretch gap-3">
								<div
									className="sm:w-[30%] shrink-0 rounded-xl p-4 flex flex-col items-center gap-3"
									style={{
										backgroundColor: "#fffde7",
										color: "#6d4c41",
									}}
								>
									<Avatar
										avatar={avatarOrDefault(
											profileData.avatar,
										)}
										size="lg"
									/>
									<div className="w-full">
										<p
											className="text-sm font-bold"
											style={{ color: "#5bad55" }}
										>
											ユーザー名
										</p>
										<p className="text-3xl font-semibold break-all">
											{profileData.name}
										</p>
									</div>
								</div>

								<div
									className="flex-1 rounded-xl p-4 space-y-2"
									style={{
										backgroundColor: "#fffde7",
										color: "#6d4c41",
									}}
								>
									<p
										className="text-sm font-bold"
										style={{ color: "#5bad55" }}
									>
										実績
									</p>
									<div className="grid grid-cols-3 gap-x-3">
										<p>
											トータルスコア:{" "}
											{profileData.total_score}
										</p>
										<p>
											1位回数:{" "}
											{profileData.first_place_count}
										</p>
										<p>
											プレイ回数: {profileData.play_count}
										</p>
									</div>
								</div>
							</div>

							<div
								className="rounded-xl p-4"
								style={{
									backgroundColor: "#fffde7",
									color: "#6d4c41",
								}}
							>
								<p
									className="text-sm font-bold"
									style={{ color: "#5bad55" }}
								>
									バッジ
								</p>
								<div className="grid grid-cols-3 gap-x-6">
									{profileData.badges &&
									profileData.badges.length > 0 ? (
										profileData.badges.map(
											(badgeName, index) => (
												<BadgeImage
													key={index}
													name={badgeName}
												/>
											),
										)
									) : (
										<p className="text-sm">
											まだバッジを持っていません
										</p>
									)}
								</div>
							</div>
						</div>

						<div
							className="rounded-xl p-4 space-y-3"
							style={{
								backgroundColor: "#fffde7",
								color: "#6d4c41",
							}}
						>
							<p
								className="text-sm font-bold"
								style={{ color: "#5bad55" }}
							>
								リーダーボード
							</p>
							<p className="text-xl">
								自分の順位:{" "}
								<span
									className="font-semibold"
									style={{ color: "#5bad55" }}
								>
									{profileData.user_rank + 1}位
								</span>
							</p>
							<div className="divide-y divide-base-300">
								<div className="flex items-center justify-between px-1 sm:px-6 py-2 text-xs font-bold">
									<span className="w-10">順位</span>
									<div className="flex items-center sm:gap-10">
										<span>ユーザー名</span>
										<span className="w-20 text-right">
											点数
										</span>
									</div>
								</div>
								{profileData.top_ranker &&
								profileData.top_ranker.length > 0 ? (
									profileData.top_ranker.map(
										({ name, score }, index) => (
											<div
												key={name}
												className="flex items-center justify-between px-1 sm:px-6 py-4"
											>
												<span className="w-10 text-xs font-bold">
													{index + 1}位
												</span>
												<div className="flex items-center sm:gap-10">
													<span className="font-medium break-all">
														{name}
													</span>
													<span className="w-20 shrink-0 text-right font-semibold tabular-nums">
														{score}点
													</span>
												</div>
											</div>
										),
									)
								) : (
									<p className="text-sm">
										まだランキングはありません
									</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</div>
	);
};

export default Profile;
