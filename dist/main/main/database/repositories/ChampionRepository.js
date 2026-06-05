"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChampionRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
function deserialize(row) {
    return {
        ...row,
        tags: JSON.parse(row.tags),
        info: JSON.parse(row.info),
        stats: JSON.parse(row.stats),
    };
}
class ChampionRepository {
    static async findById(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const row = await prisma.champion.findUnique({ where: { id } });
        return row ? deserialize(row) : null;
    }
    static async findByKey(key) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const row = await prisma.champion.findUnique({ where: { key } });
        return row ? deserialize(row) : null;
    }
    static async findAll() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const rows = await prisma.champion.findMany({ orderBy: { name: 'asc' } });
        return rows.map(deserialize);
    }
    static async count() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.champion.count();
    }
    static async upsertMany(champions) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        await prisma.$transaction(champions.map(c => prisma.champion.upsert({
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
        })));
    }
    static async getVersion() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const row = await prisma.champion.findFirst({ select: { version: true } });
        return row?.version ?? null;
    }
}
exports.ChampionRepository = ChampionRepository;
