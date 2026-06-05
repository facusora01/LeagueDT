"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
class MatchRepository {
    static async findById(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.match.findUnique({
            where: { id },
            include: {
                teams: { include: { bans: true } },
                participants: true,
            },
        });
    }
    static async exists(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const count = await prisma.match.count({ where: { id } });
        return count > 0;
    }
    static async findBySummonerId(summonerId, limit = 20) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.match.findMany({
            where: { participants: { some: { summonerId } } },
            include: {
                teams: { include: { bans: true } },
                participants: true,
            },
            orderBy: { gameCreation: 'desc' },
            take: limit,
        });
    }
    static async create(data) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.match.create({
            data: {
                id: data.id,
                gameId: data.gameId,
                platformId: data.platformId,
                queueId: data.queueId,
                mapId: data.mapId,
                seasonId: data.seasonId,
                gameCreation: data.gameCreation,
                gameDuration: data.gameDuration,
                gameMode: data.gameMode,
                gameType: data.gameType,
                gameVersion: data.gameVersion,
                teams: {
                    create: data.teams.map(t => ({
                        teamId: t.teamId,
                        win: t.win,
                        firstBlood: t.firstBlood,
                        firstTower: t.firstTower,
                        firstInhibitor: t.firstInhibitor,
                        firstBaron: t.firstBaron,
                        firstDragon: t.firstDragon,
                        firstRiftHerald: t.firstRiftHerald,
                        towerKills: t.towerKills,
                        inhibitorKills: t.inhibitorKills,
                        baronKills: t.baronKills,
                        dragonKills: t.dragonKills,
                        riftHeraldKills: t.riftHeraldKills,
                        bans: { create: t.bans },
                    })),
                },
                participants: {
                    create: data.participants.map(p => ({
                        teamId: p.teamId,
                        championId: p.championId,
                        summonerId: p.summonerId,
                        summonerName: p.summonerName,
                        participantId: p.participantId,
                        kills: p.kills,
                        deaths: p.deaths,
                        assists: p.assists,
                        goldEarned: p.goldEarned,
                        goldSpent: p.goldSpent,
                        totalDamageDealt: p.totalDamageDealt,
                        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
                        totalDamageTaken: p.totalDamageTaken,
                        totalHeal: p.totalHeal,
                        visionScore: p.visionScore,
                        wardsPlaced: p.wardsPlaced,
                        wardsKilled: p.wardsKilled,
                        creepScore: p.creepScore,
                        neutralMinionsKilled: p.neutralMinionsKilled,
                        teamObjectiveKills: p.teamObjectiveKills,
                        win: p.win,
                        items: JSON.stringify(p.items),
                        perk0: p.perk0,
                        perk1: p.perk1,
                        perk2: p.perk2,
                        perk3: p.perk3,
                        perk4: p.perk4,
                        perk5: p.perk5,
                        perkPrimaryStyle: p.perkPrimaryStyle,
                        perkSubStyle: p.perkSubStyle,
                        statPerks: JSON.stringify(p.statPerks),
                        role: p.role,
                        lane: p.lane,
                    })),
                },
            },
        });
    }
    static async deleteOlderThan(days) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return prisma.match.deleteMany({ where: { gameCreation: { lt: cutoff } } });
    }
}
exports.MatchRepository = MatchRepository;
