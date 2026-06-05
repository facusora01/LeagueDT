import { DatabaseClient } from '../DatabaseClient';
import { RecommendationType, RecommendationContext } from '../../../shared/types';

export interface CreateRecommendationData {
  summonerId: string;
  type: RecommendationType;
  context: RecommendationContext;
  priority: number;
  title: string;
  description: string;
  reasoning: string;
  data?: Record<string, unknown>;
  confidence: number;
  matchId?: string;
}

export class RecommendationRepository {
  static async create(data: CreateRecommendationData) {
    const prisma = await DatabaseClient.getInstance();
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

  static async findBySummoner(
    summonerId: string,
    options: { type?: RecommendationType; limit?: number } = {},
  ) {
    const prisma = await DatabaseClient.getInstance();
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

  static async dismiss(id: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.recommendation.update({ where: { id }, data: { dismissed: true } });
  }

  static async markActedUpon(id: string) {
    const prisma = await DatabaseClient.getInstance();
    return prisma.recommendation.update({ where: { id }, data: { actedUpon: true } });
  }

  static async deleteOlderThan(days: number) {
    const prisma = await DatabaseClient.getInstance();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.recommendation.deleteMany({ where: { timestamp: { lt: cutoff } } });
  }
}
