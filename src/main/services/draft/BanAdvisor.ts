import { analyzeComposition, type ChampionTag } from './TeamCompositionAnalyzer';
import type { ChampionData, MasteryData } from './ChampionRecommendationEngine';

export interface BanSuggestion {
  champion: ChampionData;
  score: number;      // 0–100
  reasons: string[];
}

export interface BanAdvisorInput {
  allyPicks: ChampionData[];
  enemyPicks: ChampionData[];          // already locked enemy picks
  allChampions: ChampionData[];
  allyMasteries: MasteryData[];        // to avoid banning ally comfort picks
  alreadyBanned: number[];
  highPriorityMeta: number[];          // champion IDs considered strong in current meta
}

// Tags that threaten specific ally compositions
const THREAT_MAP: Partial<Record<ChampionTag, ChampionTag[]>> = {
  Assassin: ['Mage', 'Support'],
  Tank: ['Assassin'],
  Mage: ['Fighter'],
  Marksman: ['Tank'],
};

export function generateBanSuggestions(input: BanAdvisorInput): BanSuggestion[] {
  const { allyPicks, allChampions, allyMasteries, alreadyBanned, highPriorityMeta } = input;

  const banned = new Set(alreadyBanned);
  const picked = new Set([...allyPicks.map(c => c.id), ...input.enemyPicks.map(c => c.id)]);
  const allyMasteryMap = new Map(allyMasteries.map(m => [m.championId, m]));
  const allyAnalysis = analyzeComposition(allyPicks.map(c => c.tags));

  const candidates = allChampions.filter(c => !banned.has(c.id) && !picked.has(c.id));

  const suggestions: BanSuggestion[] = candidates.map(champion => {
    const reasons: string[] = [];
    let score = 0;

    // ── Meta priority (0–30) ─────────────────────────────────────────────
    if (highPriorityMeta.includes(champion.id)) {
      score += 30;
      reasons.push('Campeón de alto nivel en la meta actual');
    }

    // ── Ally weakness counter (0–35) ──────────────────────────────────────
    let threatScore = 0;
    for (const tag of champion.tags as ChampionTag[]) {
      const threatens = THREAT_MAP[tag] ?? [];
      for (const threatened of threatens) {
        if (allyAnalysis.tags[threatened] > 0) {
          threatScore += 12;
        }
      }
    }
    if (threatScore > 0) {
      score += Math.min(35, threatScore);
      reasons.push('Amenaza directa a la composición aliada');
    }

    // ── Ally low mastery penalty — avoid banning allies' comfort picks ────
    // (don't suggest banning something our team is good at)
    const allyMastery = allyMasteryMap.get(champion.id);
    if (allyMastery && allyMastery.level >= 5) {
      score -= 40;
      reasons.length = 0; // clear
      reasons.push('Comfort pick del equipo aliado — no banear');
    }

    // ── High pick rate proxy: many tags coverage = flexible champ ─────────
    if (champion.tags.length >= 2 && !allyMastery) {
      score += 5;
      if (reasons.length === 0) reasons.push('Campeón flexible con múltiples roles');
    }

    if (reasons.length === 0 && score > 0) reasons.push('Potencial amenaza para el equipo');

    return { champion, score: Math.max(0, Math.min(100, score)), reasons };
  });

  return suggestions
    .filter(s => s.score > 0 && !s.reasons[0]?.includes('no banear'))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
