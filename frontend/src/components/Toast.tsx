interface ToastProps {
	type: "success" | "error" | "info" | "warning";
	message: string;
}

const Toast = ({ type, message }: ToastProps) => {
	return (
		<div className="toast toast-top toast-center">
			<div
				className={`alert alert-${type} shadow-lg border-none bg-emerald-500 text-white`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span className="font-bold">{message}</span>
			</div>
		</div>
	);
};

export default Toast;
