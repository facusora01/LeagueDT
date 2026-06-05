"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
class RecommendationRepository {
    static async create(data) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.recommendation.create({
            data: {
                summonerId: data.summonerId,
                type: data.type,
                context: data.context,
                priority: data.priority,
                title: data.title,
                description: data.description,
                reasoning: data.reasoning,
                data: JSON.stringify(data.data ?? {}),
                confidence: data.confidence,
                matchId: data.matchId,
            },
        });
    }
    static async findBySummoner(summonerId, options = {}) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.recommendation.findMany({
            where: {
                summonerId,
                dismissed: false,
                ...(options.type && { type: options.type }),
            },
            orderBy: [{ priority: 'desc' }, { timestamp: 'desc' }],
            take: options.limit ?? 50,
        });
    }
    static async dismiss(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.recommendation.update({ where: { id }, data: { dismissed: true } });
    }
    static async markActedUpon(id) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        return prisma.recommendation.update({ where: { id }, data: { actedUpon: true } });
    }
    static async deleteOlderThan(days) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return prisma.recommendation.deleteMany({ where: { timestamp: { lt: cutoff } } });
    }
}
exports.RecommendationRepository = RecommendationRepository;
