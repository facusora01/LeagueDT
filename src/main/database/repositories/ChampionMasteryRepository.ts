import { DatabaseClient } from '../DatabaseClient';

export class ChampionMasteryRepository {
  static async findBySummoner(summonerId: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.championMastery.findMany({
      where: { summonerId },
      orderBy: { points: 'desc' },
    });
  }

  static async findOne(summonerId: string, championId: number) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.championMastery.findUnique({
      where: { summonerId_championId: { summonerId, championId } },
    });
  }

  static async upsertMany(
    summonerId: string,
    masteries: Array<{
      championId: number;
      level: number;
      points: number;
      lastPlayTime: Date;
      chestGranted: boolean;
      tokensEarned: number;
    }>,
  ) {
    const prisma = await DatabaseClient.getInstance();

    await prisma.$transaction(
      masteries.map(m =>
        prisma.championMastery.upsert({
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
        }),
      ),
    );
  }

  static async deleteForSummoner(summonerId: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.championMastery.deleteMany({ where: { summonerId } });
  }
}
