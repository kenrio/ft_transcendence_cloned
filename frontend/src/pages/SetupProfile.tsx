import React, { useState, useMemo } from "react";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/apiClient";
import { useAuth } from "../features/auth/useAuth";
import Footer from "../components/footer/Footer";
import { LogoNavbar } from "../components/LogoNavbar";
import { AuthFormShell } from "../components/auth/AuthFormShell";
import { AuthTextField } from "../components/auth/AuthTextField";

type SetupProfileLocationState = {
	from?: Location;
	reason?: "profile_incomplete";
};

export type SetupProfileField = "name";
export type FormErrors = Partial<Record<SetupProfileField, string>>;

const SetupProfile = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { refreshAuth } = useAuth();
	const [name, setName] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);

	const [submitErrors, setSubmitErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<
		Partial<Record<SetupProfileField, boolean>>
	>({});

	const from = (location.state as SetupProfileLocationState)?.from;
	const isRedirectedForIncomplete =
		(location.state as SetupProfileLocationState)?.reason ===
		"profile_incomplete";

	const normalizeErrResponse = (err: unknown) => {
		if (!(err instanceof ApiError)) {
			return err instanceof Error
				? err.message
				: "予期しないエラーが発生しました";
		}
		const body =
			typeof err.data === "object" && err.data !== null
				? (err.data as { field?: unknown; message?: unknown })
				: null;
		const message = typeof body?.message === "string" ? body.message : null;
		return message ?? "予期しないエラーが発生しました";
	};

	const validateSetupProfileForm = (
		name: string,
	): { valid: boolean; errors: FormErrors } => {
		const errors: FormErrors = {};

		if (!name.trim()) {
			errors.name = "ユーザー名を入力してください";
		} else if (!/^[a-z0-9_]+$/.test(name)) {
			errors.name = "ユーザー名には半角英数字と「_」のみ使用できます";
		} else if (name.length > 15) {
			errors.name = "ユーザー名は15文字以内で入力してください";
		}

		return {
			valid: Object.keys(errors).length === 0,
			errors,
		};
	};
	const validationResult = useMemo(
		() => validateSetupProfileForm(name),
		[name],
	);

	const isFormValid = validationResult.valid;

	const fieldErrorsToShow: FormErrors = useMemo(() => {
		const result: FormErrors = {};
		for (const field of ["name"] as const) {
			const err = submitErrors[field] ?? validationResult.errors[field];
			if (err && touched[field]) {
				result[field] = err;
			}
		}
		return result;
	}, [validationResult.errors, touched, submitErrors]);

	const setFieldTouched = (field: SetupProfileField) => {
		setTouched(prev => ({ ...prev, [field]: true }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setServerError(null);
		setSubmitErrors({});

		if (!validationResult.valid) {
			setTouched({
				name: true,
			});
			setSubmitErrors(validationResult.errors);
			return;
		}

		try {
			await authApi.updateMe({ name: name.trim() });
			const ok = await refreshAuth();
			if (!ok) {
				setServerError("更新に失敗しました。再度お試しください。");
				return;
			}
			navigate(from ?? "/", { replace: true });
		} catch (err) {
			const message = normalizeErrResponse(err);
			setTouched(prev => ({ ...prev, name: true }));
			setSubmitErrors(prev => ({ ...prev, name: message }));
		}
	};

	return (
		<>
			<div className="min-h-screen flex flex-col">
				{/* Navbar with logo only */}
				<LogoNavbar linkToHome />

				<div className="flex-1 flex flex-col items-center justify-center p-6">
					<div className="w-full max-w-3xl flex flex-col gap-6 items-center">
						{isRedirectedForIncomplete && (
							<p className="text-center text-error">
								ユーザー名が未設定のため、設定してください。
							</p>
						)}

						<AuthFormShell
							title="プロフィール設定"
							serverError={serverError}
							onSubmit={handleSubmit}
							actions={
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
									登録する
								</button>
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
									autoComplete: "name",
									value: name,
									onChange: e => setName(e.target.value),
									onBlur: () => setFieldTouched("name"),
								}}
							/>
						</AuthFormShell>
					</div>
				</div>
				<Footer />
			</div>
		</>
	);
};

export default SetupProfile;
