/// <reference types="node" />
import { PrismaClient } from "../../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Starting database seeding...\n");

	// Seed Badges
	console.log("🏅 Seeding badges...");
	const firstWin = await prisma.badge.upsert({
		where: { id: 1 },
		update: {
			name: "firstWin",
			description: "Won your first game!",
		},
		create: {
			name: "firstWin",
			description: "Won your first game!",
		},
	});

	const happyPlayer = await prisma.badge.upsert({
		where: { id: 2 },
		update: {
			name: "happyPlayer",
			description: "you played 5 times",
		},
		create: {
			name: "happyPlayer",
			description: "you played 5 times",
		},
	});

	const richScore = await prisma.badge.upsert({
		where: { id: 3 },
		update: {
			name: "richScore",
			description: "you get 100 score",
		},
		create: {
			name: "richScore",
			description: "you get 100 score",
		},
	});

	console.log("✅ Badges seeded:", { firstWin, happyPlayer, richScore });
	console.log("\n🎉 All seeding completed successfully!");
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async e => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
