import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import visibilityIcon from "../../images/auth/visibility.svg";
import visibilityOffIcon from "../../images/auth/visibility_off.svg";

type Props = {
	label: string;
	htmlFor: string;
	description?: string;
	error?: string;
	inputProps: InputHTMLAttributes<HTMLInputElement>;
};

export function AuthTextField({
	label,
	htmlFor,
	description,
	error,
	inputProps,
}: Props) {
	const { type, ...restInputProps } = inputProps;
	const isPassword = type === "password";
	const [showPassword, setShowPassword] = useState(false);
	const resolvedType = isPassword && showPassword ? "text" : (type ?? "text");

	return (
		<div className="form-control">
			<label
				htmlFor={htmlFor}
				className="text-base font-bold"
				style={{ color: "#6d4c41" }}
			>
				{label}
			</label>

			{description && (
				<p className="text-sm" style={{ color: "#6d4c41" }}>
					{description}
				</p>
			)}

			<div className="mt-2">
				<div className="relative">
					<input
						{...restInputProps}
						type={resolvedType}
						className={`w-full rounded-lg px-3 py-2 border text-base focus:outline-none focus:ring-2 focus:ring-[#5bad55] focus:border-[#5bad55] ${
							isPassword ? "pr-10" : ""
						}`}
						style={{
							backgroundColor: "#fffde7",
							color: "#6d4c41",
							borderColor: "#6d4c41",
						}}
					/>
					{isPassword && (
						<button
							type="button"
							className="absolute right-2 top-1/2 -translate-y-1/2 px-1 cursor-pointer bg-transparent hover:bg-transparent focus:outline-none focus-visible:outline-none active:outline-none"
							onClick={() => setShowPassword(prev => !prev)}
							aria-label={
								showPassword
									? "パスワードを隠す"
									: "パスワードを表示"
							}
						>
							<img
								src={
									showPassword
										? visibilityOffIcon
										: visibilityIcon
								}
								alt={
									showPassword
										? "パスワードを隠す"
										: "パスワードを表示"
								}
								className="w-4 h-4"
							/>
						</button>
					)}
				</div>
			</div>

			{error && <p className="text-sm text-error">{error}</p>}
		</div>
	);
}
