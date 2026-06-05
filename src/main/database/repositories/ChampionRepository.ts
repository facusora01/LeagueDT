import { DatabaseClient } from '../DatabaseClient';
import type { Champion, ChampionInfo, ChampionStats } from '../../../shared/types';

interface ChampionDbRow {
  id: number;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string;
  info: string;
  stats: string;
  version: string;
}

function deserialize(row: ChampionDbRow): Champion {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
    info: JSON.parse(row.info) as ChampionInfo,
    stats: JSON.parse(row.stats) as ChampionStats,
  };
}

export class ChampionRepository {
  static async findById(id: number): Promise<Champion | null> {
    const prisma = await DatabaseClient.getInstance();
    const row = await prisma.champion.findUnique({ where: { id } });
    return row ? deserialize(row) : null;
  }

  static async findByKey(key: string): Promise<Champion | null> {
    const prisma = await DatabaseClient.getInstance();
    const row = await prisma.champion.findUnique({ where: { key } });
    return row ? deserialize(row) : null;
  }

  static async findAll(): Promise<Champion[]> {
    const prisma = await DatabaseClient.getInstance();
    const rows = await prisma.champion.findMany({ orderBy: { name: 'asc' } });
    return rows.map(deserialize);
  }

  static async count(): Promise<number> {
    const prisma = await DatabaseClient.getInstance();
    return prisma.champion.count();
  }

  static async upsertMany(champions: Champion[]): Promise<void> {
    const prisma = await DatabaseClient.getInstance();

    await prisma.$transaction(
      champions.map(c =>
        prisma.champion.upsert({
          where: { id: c.id },
          update: {
            key: c.key,
            name: c.name,
            title: c.title,
            blurb: c.blurb,
            tags: JSON.stringify(c.tags),
            info: JSON.stringify(c.info),
            stats: JSON.stringify(c.stats),
            version: c.version,
          },
          create: {
            id: c.id,
            key: c.key,
            name: c.name,
            title: c.title,
            blurb: c.blurb,
            tags: JSON.stringify(c.tags),
            info: JSON.stringify(c.info),
            stats: JSON.stringify(c.stats),
            version: c.version,
          },
        }),
      ),
    );
  }

  static async getVersion(): Promise<string | null> {
    const prisma = await DatabaseClient.getInstance();
    const row = await prisma.champion.findFirst({ select: { version: true } });
    return row?.version ?? null;
  }
}
