interface TimerProps {
	totalTime: number;
	timeLeft: number;
}

const Timer = ({ timeLeft, totalTime }: TimerProps) => {
	const percentage = Math.max(0, (timeLeft / totalTime) * 100);

	// 表示
	return (
		<div
			className="rounded-lg p-4 flex flex-col gap-2"
			style={{ backgroundColor: "#fffde7" }}
		>
			<p className="text-sm font-bold" style={{ color: "#5bad55" }}>
				残り時間
			</p>

			<div className="flex items-center gap-2">
				<span
					className="countdown font-mono text-2xl font-semibold"
					style={{ color: "#6d4c41" }}
				>
					<span
						style={
							{
								"--value": timeLeft,
								"--digits": 2,
							} as React.CSSProperties
						}
					></span>
				</span>
				<span
					className="font-mono text-2xl font-semibold mr-2"
					style={{ color: "#6d4c41" }}
				>
					秒
				</span>
				<div
					className="w-full rounded-full h-3 overflow-hidden"
					style={{ backgroundColor: "#e8d5b0" }}
				>
					<div
						className="h-full transition-all duration-1000 ease-linear"
						style={{
							width: `${percentage}%`,
							backgroundColor:
								timeLeft <= 10 ? "#d97706" : "#5bad55",
						}}
					></div>
				</div>
			</div>
		</div>
	);
};

export default Timer;
