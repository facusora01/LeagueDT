"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
function deserialize(row) {
    return {
        ...row,
        into: JSON.parse(row.into),
        from: JSON.parse(row.from),
        gold: JSON.parse(row.gold),
        tags: JSON.parse(row.tags),
        stats: JSON.parse(row.stats),
    };
}
class ItemRepository {
    static async findById(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const row = await prisma.item.findUnique({ where: { id } });
        return row ? deserialize(row) : null;
    }
    static async findAll() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const rows = await prisma.item.findMany({ orderBy: { name: 'asc' } });
        return rows.map(deserialize);
    }
    static async count() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.item.count();
    }
    static async upsertMany(items) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        await prisma.$transaction(items.map(item => prisma.item.upsert({
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
        })));
    }
}
exports.ItemRepository = ItemRepository;
