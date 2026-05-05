import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../images/logo.svg";

const logoImg = (
	<img src={Logo} alt="お絵描きアイランド" className="h-20 w-auto p-1" />
);

type LogoNavbarProps = {
	/** ロゴをホームへのリンクで包むか */
	linkToHome?: boolean;
	/** 左側のスロット（例: ホームリンク） */
	leftSlot?: ReactNode;
	/** 右側のスロット（例: ログアウトボタン） */
	rightSlot?: ReactNode;
};

export function LogoNavbar({
	linkToHome = false,
	leftSlot,
	rightSlot,
}: LogoNavbarProps) {
	const hasSlots = leftSlot != null || rightSlot != null;
	const centerContent = linkToHome ? (
		<Link to="/" className="flex items-center justify-center">
			{logoImg}
		</Link>
	) : (
		logoImg
	);

	if (!hasSlots) {
		return (
			<div className="h-25 flex items-center px-6">
				<div className="flex-1 flex justify-center">
					{centerContent}
				</div>
			</div>
		);
	}

	return (
		<div className="h-25 flex items-center px-6">
			<div className="flex-1 flex items-center">{leftSlot}</div>
			<div className="flex-1 flex justify-center">{centerContent}</div>
			<div className="flex-1 flex justify-end items-center">
				{rightSlot}
			</div>
		</div>
	);
}
