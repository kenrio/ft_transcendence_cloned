import type { ReactNode } from "react";

type AuthPageTitleProps = {
	children: ReactNode;
	className?: string;
};

export function AuthPageTitle({ children, className }: AuthPageTitleProps) {
	return (
		<div className={`text-center mb-5 ${className ?? ""}`.trim()}>
			<span className="text-2xl font-bold">{children}</span>
		</div>
	);
}
