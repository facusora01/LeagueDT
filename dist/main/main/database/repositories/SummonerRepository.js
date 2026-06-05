"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummonerRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
class SummonerRepository {
    static async findByPuuid(puuid) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.summoner.findUnique({ where: { puuid } });
    }
    static async findBySummonerId(summonerId) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.summoner.findUnique({ where: { summonerId } });
    }
    static async upsert(data) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.summoner.upsert({
            where: { puuid: data.puuid },
            update: {
                name: data.name,
                tagLine: data.tagLine,
                profileIconId: data.profileIconId,
                level: data.level,
                region: data.region,
                lastUpdated: data.lastUpdated,
            },
            create: data,
        });
    }
    static async findAll() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.summoner.findMany({ orderBy: { lastUpdated: 'desc' } });
    }
    static async delete(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.summoner.delete({ where: { id } });
    }
}
exports.SummonerRepository = SummonerRepository;
