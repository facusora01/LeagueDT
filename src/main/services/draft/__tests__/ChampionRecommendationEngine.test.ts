import { generateRecommendations, type RecommendationInput, type ChampionData } from '../ChampionRecommendationEngine';

const CHAMPIONS: ChampionData[] = [
  { id: 1, name: 'Tank1', tags: ['Tank', 'Fighter'] },
  { id: 2, name: 'Mage1', tags: ['Mage'] },
  { id: 3, name: 'ADC1', tags: ['Marksman'] },
  { id: 4, name: 'Support1', tags: ['Support'] },
  { id: 5, name: 'Assassin1', tags: ['Assassin'] },
  { id: 6, name: 'Fighter1', tags: ['Fighter'] },
  { id: 7, name: 'Mage2', tags: ['Mage', 'Support'] },
  { id: 8, name: 'Tank2', tags: ['Tank'] },
];

const baseInput = (): RecommendationInput => ({
  allyPicks: [],
  enemyPicks: [],
  availableChampions: CHAMPIONS,
  masteries: [],
  bannedIds: [],
});

describe('generateRecommendations', () => {
  test('returns at most 10 results', () => {
    const result = generateRecommendations(baseInput());
    expect(result.length).toBeLessThanOrEqual(10);
  });

  test('excludes already picked champions', () => {
    const input = baseInput();
    input.allyPicks = [CHAMPIONS[0]]; // Tank1
    const result = generateRecommendations(input);
    expect(result.find(r => r.champion.id === 1)).toBeUndefined();
  });

  test('excludes banned champions', () => {
    const input = baseInput();
    input.bannedIds = [3]; // ADC1
    const result = generateRecommendations(input);
    expect(result.find(r => r.champion.id === 3)).toBeUndefined();
  });

  test('champions that fill missing roles get higher score', () => {
    const input = baseInput();
    // Ally team has Tank + Mage — needs ADC, Support
    input.allyPicks = [CHAMPIONS[0], CHAMPIONS[1]];

    const result = generateRecommendations(input);
    const adcRec = result.find(r => r.champion.id === 3);
    const assassinRec = result.find(r => r.champion.id === 5);

    expect(adcRec).toBeDefined();
    expect(assassinRec).toBeDefined();
    expect(adcRec!.score).toBeGreaterThan(assassinRec!.score);
  });

  test('mastery level boosts champion score', () => {
    // Both are Assassins (same type, neither fills any essential role)
    // so mastery is the only differentiator
    const assassin1: ChampionData = { id: 10, name: 'Assassin_WithMastery', tags: ['Assassin'] };
    const assassin2: ChampionData = { id: 11, name: 'Assassin_NoMastery', tags: ['Assassin'] };

    const input = baseInput();
    input.availableChampions = [assassin1, assassin2];
    input.masteries = [{ championId: 10, level: 7, points: 200000 }];

    const result = generateRecommendations(input);
    const withMastery = result.find(r => r.champion.id === 10);
    const noMastery = result.find(r => r.champion.id === 11);

    expect(withMastery).toBeDefined();
    expect(noMastery).toBeDefined();
    expect(withMastery!.score).toBeGreaterThan(noMastery!.score);
    expect(withMastery!.masteryLevel).toBe(7);
  });

  test('results are sorted by score descending', () => {
    const result = generateRecommendations(baseInput());
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  test('each recommendation has at least one reason', () => {
    const input = baseInput();
    input.allyPicks = [CHAMPIONS[0]];
    input.masteries = [{ championId: 2, level: 5, points: 80000 }];

    const result = generateRecommendations(input);
    for (const rec of result) {
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });

  test('all scores are between 0 and 100', () => {
    const result = generateRecommendations(baseInput());
    for (const rec of result) {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
    }
  });

  test('empty available pool returns empty array', () => {
    const input = baseInput();
    input.availableChampions = [];
    expect(generateRecommendations(input)).toHaveLength(0);
  });
});
