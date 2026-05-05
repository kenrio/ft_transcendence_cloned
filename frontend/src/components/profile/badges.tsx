import kakuni from "../../images/badges/food_kakuni_manju.png";
import ika from "../../images/badges/food_ika_ikidukuri_naruko.png";
import curry from "../../images/badges/food_kanazawa_curry.png";

export const imageMap: Record<string, string> = {
	firstWin: kakuni,
	happyPlayer: ika,
	richScore: curry,
};

export const nameMap: Record<string, string> = {
	firstWin: "初めての勝利！",
	happyPlayer: "5回遊んだ！",
	richScore: "100点取った！",
};

export const BadgeImage = ({ name }: { name: string }) => {
	if (!imageMap[name]) return null;
	else {
		return (
			<div className="flex flex-col items-center">
				<img src={imageMap[name]} width={100} />
				<p>{nameMap[name]}</p>
			</div>
		);
	}
};

export const BadgeName = ({ name }: { name: string }) => {
	if (!imageMap[name]) return null;
	else {
		return nameMap[name];
	}
};
