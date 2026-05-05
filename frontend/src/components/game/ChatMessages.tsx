import { useRef, useEffect } from "react";

export interface Message {
	id: string;
	sender: string;
	text: string;
	timestamp: Date;
}

interface ChatMessagesProps {
	messages: Message[];
	currentUserName: string;
}

const ChatMessages = ({ messages, currentUserName }: ChatMessagesProps) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	}, [messages.length]);

	return (
		<div
			ref={scrollContainerRef}
			className="space-y-2 h-80 overflow-y-auto p-3 rounded-lg"
			style={{ backgroundColor: "#f4d59c" }}
		>
			{messages.length === 0 ? (
				<p
					className="text-center text-sm py-2"
					style={{ color: "#6d4c41" }}
				>
					メッセージはまだありません
				</p>
			) : (
				messages.map(message => {
					const isOwnMessage = message.sender === currentUserName;
					return (
						<div key={message.id}>
							<div className="flex items-baseline gap-4 py-2 px-1">
								<span
									className="text-sm shrink-0"
									style={{
										color: isOwnMessage
											? "#5bad55"
											: "#6d4c41",
									}}
								>
									{message.sender}
								</span>
								<span
									className="text-base font-bold break-all"
									style={{ color: "#6d4c41" }}
								>
									{message.text}
								</span>
							</div>
							<div
								className="h-px w-full"
								style={{ backgroundColor: "#fffde7" }}
							/>
						</div>
					);
				})
			)}
			<div />
		</div>
	);
};

export default ChatMessages;
