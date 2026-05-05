import { type Player } from "../../types/room";

interface ScoreBoardProps {
	players: Player[];
}

const ScoreBoard = ({ players }: ScoreBoardProps) => {
	const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

	return (
		<div
			className="rounded-lg p-4 flex flex-col gap-3"
			style={{ backgroundColor: "#fffde7" }}
		>
			<p className="text-sm font-bold" style={{ color: "#5bad55" }}>
				スコア
			</p>

			<div className="flex flex-col gap-2">
				{sortedPlayers.map(player => (
					<div
						key={player.id}
						className="flex items-center justify-between px-3 py-3 rounded-md"
						style={{ backgroundColor: "#f4d59c" }}
					>
						<span
							className="font-semibold"
							style={{ color: "#6d4c41" }}
						>
							{player.isDrawing ? "🖌 " : ""}
							{player.name}
						</span>
						<span
							className="font-bold tabular-nums"
							style={{ color: "#6d4c41" }}
						>
							{player.score}点
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

export default ScoreBoard;
