import Footer from "../components/footer/Footer";
import React, { useState, useMemo, useEffect } from "react";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/apiClient";
import { AuthFormShell } from "../components/auth/AuthFormShell";
import { AuthTextField } from "../components/auth/AuthTextField";
import { GoogleAccountRegister } from "../components/auth/GoogleAccountRegister";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { LogoNavbar } from "../components/LogoNavbar";
import {
	REGISTER_ERROR_MESSAGES,
	type RegisterError,
	type RegisterField,
	type FormErrors,
} from "../types/register";

/** バックエンドと同一のルールでフォームを検証 */
const validateRegisterForm = (
	name: string,
	email: string,
	password: string,
	passwordConfirm: string,
): { valid: boolean; errors: FormErrors } => {
	const errors: FormErrors = {};

	if (!name.trim()) {
		errors.name = "ユーザー名を入力してください";
	} else if (!/^[a-z0-9_]+$/.test(name)) {
		errors.name = "ユーザー名には半角英数字と「_」のみ使用できます";
	} else if (name.length > 15) {
		errors.name = "ユーザー名は15文字以内で入力してください";
	}

	if (!email.trim()) {
		errors.email = "メールアドレスを入力してください";
	} else if (
		!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
			email,
		)
	) {
		errors.email = "メールアドレスの形式が正しくありません";
	}

	if (!password.trim()) {
		errors.password = "パスワードを入力してください";
	} else if (password.length < 8) {
		errors.password = "パスワードは8文字以上で入力してください";
	} else if (
		!/[A-Z]/.test(password) ||
		!/[a-z]/.test(password) ||
		!/[0-9]/.test(password)
	) {
		errors.password =
			"パスワードには英大文字・英小文字・数字をそれぞれ1文字以上含めてください";
	}

	if (!passwordConfirm.trim()) {
		errors.passwordConfirm = "パスワード確認を入力してください";
	} else if (password !== passwordConfirm) {
		errors.passwordConfirm = "パスワードが一致しません";
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors,
	};
};

const AccountRegister = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");

	const [touched, setTouched] = useState<
		Partial<Record<RegisterField, boolean>>
	>({});
	const [serverError, setServerError] = useState<string | null>(null);
	const [submitErrors, setSubmitErrors] = useState<FormErrors>({});

	// OAuth コールバックの error を表示し、URL をクリーン
	useEffect(() => {
		const error = searchParams.get("error");
		if (!error) return;
		const message = REGISTER_ERROR_MESSAGES[error];
		if (message) {
			queueMicrotask(() => setServerError(message));
		}
		navigate(location.pathname, { replace: true });
	}, [searchParams, location.pathname, navigate]);

	const validationResult = useMemo(
		() => validateRegisterForm(name, email, password, passwordConfirm),
		[name, email, password, passwordConfirm],
	);

	const isFormValid = validationResult.valid;

	const fieldErrorsToShow: FormErrors = useMemo(() => {
		const result: FormErrors = {};
		for (const field of [
			"name",
			"email",
			"password",
			"passwordConfirm",
		] as const) {
			const err = submitErrors[field] ?? validationResult.errors[field];
			if (err && touched[field]) {
				result[field] = err;
			}
		}
		return result;
	}, [validationResult.errors, touched, submitErrors]);

	const setFieldTouched = (field: RegisterField) => {
		setTouched(prev => ({ ...prev, [field]: true }));
	};

	const normalizeErrResponse = (err: unknown): RegisterError => {
		if (!(err instanceof ApiError)) {
			return {
				type: "unknown",
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
		const field = typeof body?.field === "string" ? body.field : null;
		const message = typeof body?.message === "string" ? body.message : null;

		if (err.status === 400 && field !== null && message !== null) {
			if (field === "name" || field === "email" || field === "password") {
				return {
					type: "field",
					field: field,
					message: message,
				};
			}
		}

		if (err.status === 500 && message !== null) {
			return {
				type: "server",
				message: message,
			};
		}

		return {
			type: "unknown",
			message: "予期しないエラーが発生しました",
		};
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setServerError(null);
		setSubmitErrors({});

		if (!validationResult.valid) {
			setTouched({
				name: true,
				email: true,
				password: true,
				passwordConfirm: true,
			});
			setSubmitErrors(validationResult.errors);
			return;
		}

		try {
			await authApi.register({ name, email, password });
			navigate("/");
		} catch (err) {
			const result = normalizeErrResponse(err);

			if (result.type === "field") {
				setTouched(prev => ({ ...prev, [result.field]: true }));
				setSubmitErrors(prev => ({
					...prev,
					[result.field]: result.message,
				}));
			} else {
				setServerError(result.message);
			}
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
							title="アカウント新規作成"
							serverError={serverError}
							onSubmit={handleSubmit}
							top={
								<>
									<GoogleAccountRegister />
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
										className="w-full py-3 rounded-xl text-base font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										style={{
											backgroundColor: "#5bad55",
										}}
										onMouseEnter={e => {
											if (isFormValid) {
												e.currentTarget.style.backgroundColor =
													"#4e9b49";
											}
										}}
										onMouseLeave={e => {
											e.currentTarget.style.backgroundColor =
												"#5bad55";
										}}
										disabled={!isFormValid}
									>
										アカウント作成
									</button>
								</>
							}
						>
							<AuthTextField
								label="ユーザー名"
								htmlFor="name"
								description="半角英字、数字、_を使用できます（15文字以内）。"
								error={fieldErrorsToShow.name}
								inputProps={{
									id: "name",
									type: "text",
									name: "name",
									placeholder: "例: user_name",
									autoComplete: "username",
									value: name,
									onChange: e => setName(e.target.value),
									onBlur: () => setFieldTouched("name"),
								}}
							/>

							<AuthTextField
								label="メールアドレス"
								htmlFor="email"
								error={fieldErrorsToShow.email}
								inputProps={{
									id: "email",
									type: "text",
									name: "email",
									placeholder: "example@example.com",
									autoComplete: "email",
									value: email,
									onChange: e => setEmail(e.target.value),
									onBlur: () => setFieldTouched("email"),
								}}
							/>

							<AuthTextField
								label="パスワード"
								htmlFor="password"
								description="大文字・小文字・数字を組み合わせて8文字以上で入力してください。"
								error={fieldErrorsToShow.password}
								inputProps={{
									id: "password",
									type: "password",
									name: "password",
									autoComplete: "new-password",
									value: password,
									onChange: e => setPassword(e.target.value),
									onBlur: () => setFieldTouched("password"),
								}}
							/>

							<AuthTextField
								label="パスワード確認"
								htmlFor="passwordConfirm"
								error={fieldErrorsToShow.passwordConfirm}
								inputProps={{
									id: "passwordConfirm",
									type: "password",
									name: "passwordConfirm",
									autoComplete: "new-password",
									value: passwordConfirm,
									onChange: e =>
										setPasswordConfirm(e.target.value),
									onBlur: () =>
										setFieldTouched("passwordConfirm"),
								}}
							/>
						</AuthFormShell>
					</div>
				</div>
				{/* フッター */}
				<Footer />
			</div>
		</>
	);
};

export default AccountRegister;
