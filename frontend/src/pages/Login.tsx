import React, { useState, useEffect } from "react";
import {
	useNavigate,
	useSearchParams,
	useLocation,
	Link,
	type Location,
} from "react-router-dom";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/apiClient";
import { useAuth } from "../features/auth/useAuth";
import Footer from "../components/footer/Footer";
import { LogoNavbar } from "../components/LogoNavbar";
import { AuthFormShell } from "../components/auth/AuthFormShell";
import { AuthTextField } from "../components/auth/AuthTextField";
import { GoogleAccountLogin } from "../components/auth/GoogleAccountLogin";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
	invalid_request:
		"認証の有効期限が切れたか、不正なリクエストです。再度お試しください",
	account_not_found:
		"Googleアカウントが登録されていません。新規登録からお試しください",
	email_conflict:
		"このメールアドレスはすでに別の方法で登録されています。パスワードでログインしてください",
	server_error:
		"予期しないエラーが発生しました。時間をおいて再度お試しください",
};

const Login = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const { refreshAuth } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<"email" | "password", string>>
	>({});
	const [serverError, setServerError] = useState<string | null>(null);

	useEffect(() => {
		const error = searchParams.get("error");
		if (!error) return;
		const message = LOGIN_ERROR_MESSAGES[error];
		if (message) {
			queueMicrotask(() => setServerError(message));
		}
		navigate("/login", { replace: true });
	}, [searchParams, navigate]);

	const validateRequired = () => {
		const nextErrors: Partial<Record<"email" | "password", string>> = {};

		if (!email.trim())
			nextErrors.email = "メールアドレスを入力してください";
		if (!password.trim())
			nextErrors.password = "パスワードを入力してください";

		setFieldErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const normalizeErrResponse = (err: unknown) => {
		if (!(err instanceof ApiError)) {
			return {
				message:
					err instanceof Error
						? err.message
						: "予期しないエラーが発生しました",
			};
		}

		const body =
			typeof err.data === "object" && err.data !== null
				? (err.data as { field?: unknown; message?: unknown })
				: null;
		const message = typeof body?.message === "string" ? body.message : null;

		if (message !== null) {
			return {
				message: message,
			};
		}

		return {
			message: "予期しないエラーが発生しました",
		};
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setServerError(null);

		// 未入力チェック
		if (!validateRequired()) return;

		try {
			await authApi.login({ email, password });
			// 認証状態を更新してから遷移（Cookie反映を待つ）
			const ok = await refreshAuth();
			if (!ok) {
				setServerError("ログインに失敗しました。再度お試しください。");
				return;
			}
			const from = (location.state as { from?: Location })?.from;
			navigate(from ?? "/", { replace: true });
		} catch (err) {
			// レスポンスの正規化
			const result = normalizeErrResponse(err);
			setServerError(result.message);
		}
	};

	return (
		<>
			<div className="min-h-screen flex flex-col">
				{/* Navbar with logo only */}
				<LogoNavbar linkToHome />

				{/* Main content */}
				<div className="flex-1 flex flex-col items-center justify-center p-6">
					<div className="w-full max-w-3xl flex flex-col gap-6 items-center">
						<AuthFormShell
							title="ログイン"
							serverError={serverError}
							onSubmit={handleSubmit}
							top={
								<>
									<GoogleAccountLogin />
									<div className="w-full flex items-center gap-3">
										<div
											className="h-px flex-1"
											style={{
												backgroundColor: "#6d4c41",
											}}
										/>
										<span
											className="text-sm"
											style={{ color: "#6d4c41" }}
										>
											または
										</span>
										<div
											className="h-px flex-1"
											style={{
												backgroundColor: "#6d4c41",
											}}
										/>
									</div>
								</>
							}
							actions={
								<>
									<button
										type="submit"
										className="w-full px-6 py-3 rounded-xl text-base font-bold bg-[#5bad55] text-white cursor-pointer transition-colors hover:bg-[#4e9b49]"
									>
										ログイン
									</button>
								</>
							}
						>
							<AuthTextField
								label="メールアドレス"
								htmlFor="email"
								error={fieldErrors.email}
								inputProps={{
									id: "email",
									type: "text",
									name: "email",
									autoComplete: "email",
									value: email,
									onChange: e => setEmail(e.target.value),
								}}
							/>

							<AuthTextField
								label="パスワード"
								htmlFor="password"
								error={fieldErrors.password}
								inputProps={{
									id: "password",
									type: "password",
									name: "password",
									autoComplete: "current-password",
									value: password,
									onChange: e => setPassword(e.target.value),
								}}
							/>
						</AuthFormShell>

						{/* 新規アカウント登録リンク */}
						<div className="w-full max-w-sm">
							<Link
								to="/register"
								className="inline-flex w-full items-center justify-center px-3 py-3 rounded-lg text-sm font-bold cursor-pointer transition-colors bg-[#ffbf47] text-[#6d4c41] hover:bg-[#ffa726] active:scale-[0.97] focus:outline-none"
							>
								新規登録はこちら
							</Link>
						</div>
					</div>
				</div>

				<Footer />
			</div>
		</>
	);
};

export default Login;
