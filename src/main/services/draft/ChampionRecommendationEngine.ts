import { analyzeComposition, getNeededRoles, type ChampionTag } from './TeamCompositionAnalyzer';

export interface ChampionData {
  id: number;
  name: string;
  tags: string[];
}

export interface MasteryData {
  championId: number;
  level: number;
  points: number;
}

export interface RecommendationInput {
  allyPicks: ChampionData[];       // already locked in / selected by allies
  enemyPicks: ChampionData[];      // known enemy picks
  availableChampions: ChampionData[];
  masteries: MasteryData[];
  bannedIds: number[];
}

export interface ChampionRecommendation {
  champion: ChampionData;
  score: number;               // 0–100
  reasons: string[];
  masteryLevel: number;
  masteryPoints: number;
  fillsRole: ChampionTag | null;
}

// Simplified counter-tag map: which tags tend to counter which
const COUNTER_MAP: Partial<Record<ChampionTag, ChampionTag[]>> = {
  Assassin: ['Mage', 'Marksman'],
  Tank: ['Assassin', 'Fighter'],
  Mage: ['Fighter', 'Tank'],
  Fighter: ['Support', 'Mage'],
  Marksman: ['Tank', 'Fighter'],
  Support: ['Assassin'],
};

export function generateRecommendations(input: RecommendationInput): ChampionRecommendation[] {
  const { allyPicks, enemyPicks, availableChampions, masteries, bannedIds } = input;

  const masteryMap = new Map<number, MasteryData>(masteries.map(m => [m.championId, m]));
  const pickedIds = new Set([
    ...allyPicks.map(c => c.id),
    ...enemyPicks.map(c => c.id),
    ...bannedIds,
  ]);

  const allyAnalysis = analyzeComposition(allyPicks.map(c => c.tags));
  const enemyAnalysis = analyzeComposition(enemyPicks.map(c => c.tags));
  const neededRoles = getNeededRoles(allyAnalysis);

  const candidates = availableChampions.filter(c => !pickedIds.has(c.id));

  const recommendations: ChampionRecommendation[] = candidates.map(champion => {
    const mastery = masteryMap.get(champion.id);
    const reasons: string[] = [];
    let score = 0;

    // ── Role fill score (0–40) ────────────────────────────────────────────
    const filledRole = neededRoles.find(role => champion.tags.includes(role)) ?? null;
    if (filledRole) {
      score += 40;
      reasons.push(`Cubre ${filledRole} que falta en el equipo`);
    }

    // ── Mastery score (0–30) ──────────────────────────────────────────────
    if (mastery) {
      const masteryScore = Math.min(30, Math.floor((mastery.level / 7) * 30));
      score += masteryScore;
      reasons.push(`Maestría ${mastery.level} (${mastery.points.toLocaleString()} pts)`);
    }

    // ── Counter score (0–20) ──────────────────────────────────────────────
    let counterCount = 0;
    for (const tag of champion.tags as ChampionTag[]) {
      const countered = COUNTER_MAP[tag] ?? [];
      for (const enemyChamp of enemyPicks) {
        if (enemyChamp.tags.some(et => countered.includes(et as ChampionTag))) {
          counterCount++;
        }
      }
    }
    if (counterCount > 0) {
      const counterScore = Math.min(20, counterCount * 7);
      score += counterScore;
      reasons.push(`Contrajugada efectiva vs. composición enemiga`);
    }

    // ── Synergy score (0–10) ──────────────────────────────────────────────
    if (allyAnalysis.hasADC && champion.tags.includes('Support')) {
      score += 5;
      reasons.push('Synergizes con ADC aliado');
    }
    if (allyAnalysis.hasSupport && champion.tags.includes('Marksman')) {
      score += 5;
      reasons.push('Synergizes con Support aliado');
    }
    if (!allyAnalysis.hasEngage && (champion.tags.includes('Tank') || champion.tags.includes('Fighter'))) {
      score += 10;
      reasons.push('Provee engage que falta');
    }

    // ── Enemy weakness score (bonus) ──────────────────────────────────────
    if (!enemyAnalysis.hasFrontline && (champion.tags.includes('Assassin') || champion.tags.includes('Mage'))) {
      score += 5;
      reasons.push('Explota la falta de frontline enemiga');
    }

    if (reasons.length === 0) reasons.push('Pick disponible');

    return {
      champion,
      score: Math.min(100, score),
      reasons,
      masteryLevel: mastery?.level ?? 0,
      masteryPoints: mastery?.points ?? 0,
      fillsRole: filledRole,
    };
  });

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
