"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChampionMasteryRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
class ChampionMasteryRepository {
    static async findBySummoner(summonerId) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.championMastery.findMany({
            where: { summonerId },
            orderBy: { points: 'desc' },
        });
    }
    static async findOne(summonerId, championId) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.championMastery.findUnique({
            where: { summonerId_championId: { summonerId, championId } },
        });
    }
    static async upsertMany(summonerId, masteries) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        await prisma.$transaction(masteries.map(m => prisma.championMastery.upsert({
            where: { summonerId_championId: { summonerId, championId: m.championId } },
            update: {
                level: m.level,
                points: m.points,
                lastPlayTime: m.lastPlayTime,
                chestGranted: m.chestGranted,
                tokensEarned: m.tokensEarned,
            },
            create: {
                summonerId,
                championId: m.championId,
                level: m.level,
                points: m.points,
                lastPlayTime: m.lastPlayTime,
                chestGranted: m.chestGranted,
                tokensEarned: m.tokensEarned,
            },
        })));
    }
    static async deleteForSummoner(summonerId) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.championMastery.deleteMany({ where: { summonerId } });
    }
}
exports.ChampionMasteryRepository = ChampionMasteryRepository;
