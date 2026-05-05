import { avatarOrDefault } from "../constants/avatar";

/**
 * アバター表示コンポーネント
 * - URLの場合はimgタグで画像表示
 * - 絵文字の場合はspanで表示
 */
interface AvatarProps {
	avatar: string;
	className?: string;
	size?: "sm" | "md" | "lg";
}

const sizeClasses = {
	sm: "w-8 h-8 text-lg",
	md: "w-12 h-12 text-2xl",
	lg: "w-20 h-20 text-4xl",
};

export const Avatar = ({
	avatar,
	className = "",
	size = "md",
}: AvatarProps) => {
	const isImageUrl =
		avatar.startsWith("http://") || avatar.startsWith("https://");
	const sizeClass = sizeClasses[size];

	if (isImageUrl) {
		return (
			<img
				src={avatar}
				alt="アバター"
				className={`rounded-full object-cover ${sizeClass} ${className}`}
				referrerPolicy="no-referrer"
			/>
		);
	}

	return (
		<div
			className={`rounded-full flex items-center justify-center ${sizeClass} ${className}`}
		>
			<span>{avatarOrDefault(avatar)}</span>
		</div>
	);
};
