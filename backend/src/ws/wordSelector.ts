import { words } from "../types/game/word";

export const selectRandomWord = (): string => {
	if (words.length === 0) {
		throw new Error("No words available");
	}
	const randomIndex = Math.floor(Math.random() * words.length);
	return words[randomIndex];
};
