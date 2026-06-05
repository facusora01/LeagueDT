import { generateBanSuggestions, type BanAdvisorInput } from '../BanAdvisor';
import type { ChampionData } from '../ChampionRecommendationEngine';

const CHAMPIONS: ChampionData[] = [
  { id: 1, name: 'Tank1', tags: ['Tank', 'Fighter'] },
  { id: 2, name: 'Mage1', tags: ['Mage'] },
  { id: 3, name: 'ADC1', tags: ['Marksman'] },
  { id: 4, name: 'Support1', tags: ['Support'] },
  { id: 5, name: 'Assassin1', tags: ['Assassin'] },
  { id: 6, name: 'Fighter1', tags: ['Fighter'] },
  { id: 7, name: 'MetaOP', tags: ['Mage', 'Assassin'] },
];

const baseInput = (): BanAdvisorInput => ({
  allyPicks: [],
  enemyPicks: [],
  allChampions: CHAMPIONS,
  allyMasteries: [],
  alreadyBanned: [],
  highPriorityMeta: [],
});

describe('generateBanSuggestions', () => {
  test('returns at most 5 suggestions', () => {
    const result = generateBanSuggestions(baseInput());
    expect(result.length).toBeLessThanOrEqual(5);
  });

  test('meta champions get higher priority', () => {
    const input = baseInput();
    input.highPriorityMeta = [7]; // MetaOP

    const result = generateBanSuggestions(input);
    const metaBan = result.find(r => r.champion.id === 7);
    expect(metaBan).toBeDefined();
    expect(result[0].champion.id).toBe(7);
  });

  test('excludes already banned champions', () => {
    const input = baseInput();
    input.highPriorityMeta = [7];
    input.alreadyBanned = [7];

    const result = generateBanSuggestions(input);
    expect(result.find(r => r.champion.id === 7)).toBeUndefined();
  });

  test('excludes already picked champions', () => {
    const input = baseInput();
    input.allyPicks = [CHAMPIONS[2]]; // ADC1

    const result = generateBanSuggestions(input);
    expect(result.find(r => r.champion.id === 3)).toBeUndefined();
  });

  test('avoids banning ally comfort picks (high mastery)', () => {
    const input = baseInput();
    input.highPriorityMeta = [2]; // Mage1 is meta
    input.allyMasteries = [{ championId: 2, level: 7, points: 300000 }];

    const result = generateBanSuggestions(input);
    // Should not suggest banning your own mastery 7 champion
    expect(result.find(r => r.champion.id === 2)).toBeUndefined();
  });

  test('suggests banning champions that threaten ally composition', () => {
    const input = baseInput();
    // Ally has Mage and Support — Assassin threatens both
    input.allyPicks = [CHAMPIONS[1], CHAMPIONS[3]]; // Mage1 + Support1

    const result = generateBanSuggestions(input);
    const assassinBan = result.find(r => r.champion.id === 5);
    expect(assassinBan).toBeDefined();
    expect(assassinBan!.score).toBeGreaterThan(0);
  });

  test('all scores are between 0 and 100', () => {
    const input = baseInput();
    input.highPriorityMeta = [1, 2, 3];
    const result = generateBanSuggestions(input);
    for (const s of result) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  test('each suggestion has at least one reason', () => {
    const input = baseInput();
    input.highPriorityMeta = [1, 2];
    const result = generateBanSuggestions(input);
    for (const s of result) {
      expect(s.reasons.length).toBeGreaterThan(0);
    }
  });
});
