import { Prisma } from '@prisma/client';
import { DatabaseClient } from '../DatabaseClient';

export class SummonerRepository {
  static async findByPuuid(puuid: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.summoner.findUnique({ where: { puuid } });
  }

  static async findBySummonerId(summonerId: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.summoner.findUnique({ where: { summonerId } });
  }

  static async upsert(data: Prisma.SummonerCreateInput) {
    const prisma = await DatabaseClient.getInstance();
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
    const prisma = await DatabaseClient.getInstance();
    return prisma.summoner.findMany({ orderBy: { lastUpdated: 'desc' } });
  }

  static async delete(id: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.summoner.delete({ where: { id } });
  }
}
