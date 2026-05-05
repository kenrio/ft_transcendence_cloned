import type { FormEventHandler, ReactNode } from "react";
import { AuthPageTitle } from "./AuthPageTitle";

type Props = {
	title: ReactNode;
	serverError?: string | null;
	onSubmit: FormEventHandler<HTMLFormElement>;
	top?: ReactNode;
	children: ReactNode;
	actions: ReactNode;
};

export function AuthFormShell({
	title,
	serverError,
	onSubmit,
	top,
	children,
	actions,
}: Props) {
	return (
		<div className="w-full max-w-md">
			<div
				className="rounded-lg p-8 flex flex-col gap-5"
				style={{ backgroundColor: "#fffde7", color: "#6d4c41" }}
			>
				<AuthPageTitle>{title}</AuthPageTitle>

				{top}

				{serverError && (
					<div className="text-error text-sm px-3 py-2">
						<span>{serverError}</span>
					</div>
				)}

				<form className="space-y-7" onSubmit={onSubmit}>
					{children}
					<div className="space-y-3 mt-10">{actions}</div>
				</form>
			</div>
		</div>
	);
}
