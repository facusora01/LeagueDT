"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatisticsRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
class UserStatisticsRepository {
    static async findBySummoner(summonerId) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const row = await prisma.userStatistics.findUnique({ where: { summonerId } });
        if (!row)
            return null;
        return {
            ...row,
            mostPlayedChampions: JSON.parse(row.mostPlayedChampions),
            roleDistribution: JSON.parse(row.roleDistribution),
        };
    }
    static async upsert(summonerId, data) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const serialized = {
            totalMatches: data.totalMatches,
            wins: data.wins,
            losses: data.losses,
            winRate: data.winRate,
            averageKDA: data.averageKDA,
            averageCSPerMinute: data.averageCSPerMinute,
            averageGoldPerMinute: data.averageGoldPerMinute,
            averageDamagePerMinute: data.averageDamagePerMinute,
            averageVisionScore: data.averageVisionScore,
            mostPlayedChampions: JSON.stringify(data.mostPlayedChampions),
            roleDistribution: JSON.stringify(data.roleDistribution),
            improvementTrend: data.improvementTrend,
        };
        return prisma.userStatistics.upsert({
            where: { summonerId },
            update: serialized,
            create: { summonerId, ...serialized },
        });
    }
}
exports.UserStatisticsRepository = UserStatisticsRepository;
