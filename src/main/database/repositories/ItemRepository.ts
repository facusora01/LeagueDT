import { DatabaseClient } from '../DatabaseClient';
import type { Item, ItemGold } from '../../../shared/types';

interface ItemDbRow {
  id: number;
  name: string;
  description: string;
  plaintext: string;
  into: string;
  from: string;
  gold: string;
  tags: string;
  stats: string;
  version: string;
}

function deserialize(row: ItemDbRow): Item {
  return {
    ...row,
    into: JSON.parse(row.into) as number[],
    from: JSON.parse(row.from) as number[],
    gold: JSON.parse(row.gold) as ItemGold,
    tags: JSON.parse(row.tags) as string[],
    stats: JSON.parse(row.stats) as Record<string, number>,
  };
}

export class ItemRepository {
  static async findById(id: number): Promise<Item | null> {
    const prisma = await DatabaseClient.getInstance();
    const row = await prisma.item.findUnique({ where: { id } });
    return row ? deserialize(row) : null;
  }

  static async findAll(): Promise<Item[]> {
    const prisma = await DatabaseClient.getInstance();
    const rows = await prisma.item.findMany({ orderBy: { name: 'asc' } });
    return rows.map(deserialize);
  }

  static async count(): Promise<number> {
    const prisma = await DatabaseClient.getInstance();
    return prisma.item.count();
  }

  static async upsertMany(items: Item[]): Promise<void> {
    const prisma = await DatabaseClient.getInstance();

    await prisma.$transaction(
      items.map(item =>
        prisma.item.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            description: item.description,
            plaintext: item.plaintext,
            into: JSON.stringify(item.into),
            from: JSON.stringify(item.from),
            gold: JSON.stringify(item.gold),
            tags: JSON.stringify(item.tags),
            stats: JSON.stringify(item.stats),
            version: item.version,
          },
          create: {
            id: item.id,
            name: item.name,
            description: item.description,
            plaintext: item.plaintext,
            into: JSON.stringify(item.into),
            from: JSON.stringify(item.from),
            gold: JSON.stringify(item.gold),
            tags: JSON.stringify(item.tags),
            stats: JSON.stringify(item.stats),
            version: item.version,
          },
        }),
      ),
    );
  }
}
