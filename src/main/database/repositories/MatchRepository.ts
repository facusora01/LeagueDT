import { DatabaseClient } from '../DatabaseClient';

export interface CreateMatchData {
  id: string;
  gameId: bigint;
  platformId: string;
  queueId: number;
  mapId: number;
  seasonId: number;
  gameCreation: Date;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  teams: Array<{
    teamId: number;
    win: boolean;
    firstBlood: boolean;
    firstTower: boolean;
    firstInhibitor: boolean;
    firstBaron: boolean;
    firstDragon: boolean;
    firstRiftHerald: boolean;
    towerKills: number;
    inhibitorKills: number;
    baronKills: number;
    dragonKills: number;
    riftHeraldKills: number;
    bans: Array<{ championId: number; pickTurn: number }>;
  }>;
  participants: Array<{
    matchId?: string;
    teamId: number;
    championId: number;
    summonerId?: string;
    puuid?: string;
    summonerName: string;
    participantId: number;
    kills: number;
    deaths: number;
    assists: number;
    goldEarned: number;
    goldSpent: number;
    totalDamageDealt: number;
    totalDamageDealtToChampions: number;
    totalDamageTaken: number;
    totalHeal: number;
    visionScore: number;
    wardsPlaced: number;
    wardsKilled: number;
    creepScore: number;
    neutralMinionsKilled: number;
    teamObjectiveKills: number;
    win: boolean;
    items: number[];
    perk0: number;
    perk1: number;
    perk2: number;
    perk3: number;
    perk4: number;
    perk5: number;
    perkPrimaryStyle: number;
    perkSubStyle: number;
    statPerks: { defense: number; flex: number; offense: number };
    role: string;
    lane: string;
  }>;
}

export class MatchRepository {
  static async findById(id: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.match.findUnique({
      where: { id },
      include: {
        teams: { include: { bans: true } },
        participants: true,
      },
    });
  }

  static async exists(id: string): Promise<boolean> {
    const prisma = await DatabaseClient.getInstance();
    const count = await prisma.match.count({ where: { id } });
    return count > 0;
  }

  static async findByPuuid(puuid: string, limit = 20) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.match.findMany({
      where: { participants: { some: { puuid } } },
      include: {
        teams: { include: { bans: true } },
        participants: true,
      },
      orderBy: { gameCreation: 'desc' },
      take: limit,
    });
  }

  static async create(data: CreateMatchData) {
    const prisma = await DatabaseClient.getInstance();

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
            puuid: p.puuid,
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

  static async deleteOlderThan(days: number) {
    const prisma = await DatabaseClient.getInstance();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.match.deleteMany({ where: { gameCreation: { lt: cutoff } } });
  }
}
