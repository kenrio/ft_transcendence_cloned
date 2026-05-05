import { Link, useNavigate } from "react-router-dom";

const BackButton = () => {
	const navigate = useNavigate();

	const handleBack = () => {
		navigate(-1);
	};

	return (
		<div className="flex justify-center gap-4 py-4">
			<button
				type="button"
				onClick={handleBack}
				className="inline-flex items-center px-3 py-2 rounded text-sm font-bold cursor-pointer text-white transition-colors"
				style={{ backgroundColor: "#4d8fff" }}
			>
				◀︎ 戻る
			</button>
			<Link
				to="/"
				className="inline-flex items-center px-3 py-2 rounded text-sm font-bold cursor-pointer text-white transition-colors"
				style={{ backgroundColor: "#29b6f6" }}
			>
				ホームへ
			</Link>
		</div>
	);
};

export default BackButton;
