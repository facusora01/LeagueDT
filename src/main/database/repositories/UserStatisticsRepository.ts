import { DatabaseClient } from '../DatabaseClient';
import type { ChampionPlayStats, RoleDistribution } from '../../../shared/types';

export class UserStatisticsRepository {
  static async findBySummoner(summonerId: string) {
    const prisma = await DatabaseClient.getInstance();
    const row = await prisma.userStatistics.findUnique({ where: { summonerId } });
    if (!row) return null;
    return {
      ...row,
      mostPlayedChampions: JSON.parse(row.mostPlayedChampions) as ChampionPlayStats[],
      roleDistribution: JSON.parse(row.roleDistribution) as RoleDistribution,
    };
  }

  static async upsert(
    summonerId: string,
    data: {
      totalMatches: number;
      wins: number;
      losses: number;
      winRate: number;
      averageKDA: number;
      averageCSPerMinute: number;
      averageGoldPerMinute: number;
      averageDamagePerMinute: number;
      averageVisionScore: number;
      mostPlayedChampions: ChampionPlayStats[];
      roleDistribution: RoleDistribution;
      improvementTrend: number;
    },
  ) {
    const prisma = await DatabaseClient.getInstance();
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
