import { useState } from "react";
import { MAX_CHAT_LENGTH } from "../../types/game";

interface ChatInputProps {
	onSendMessage: (text: string) => void;
	disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
	const [input, setInput] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (input.trim() === "") return;

		onSendMessage(input);
		setInput("");
	};

	return (
		<form onSubmit={handleSubmit} className="join w-full">
			<input
				type="text"
				maxLength={MAX_CHAT_LENGTH}
				value={input}
				onChange={e => setInput(e.target.value)}
				className="input input-bordered join-item flex-1 border-0! focus:outline-none focus:ring-0! focus:border-0! placeholder:text-[#6d4c41] disabled:opacity-50"
				style={{ backgroundColor: "#f4d59c", color: "#6d4c41" }}
				placeholder={
					disabled ? "観戦者はチャットできません" : "コメントを入力…"
				}
				disabled={disabled}
			/>
			<button
				type="submit"
				className="btn join-item border-0! shadow-none! bg-[#ffbf47] text-[#6d4c41] hover:bg-[#ffa726]"
				disabled={disabled}
			>
				送信
			</button>
		</form>
	);
};

export default ChatInput;
