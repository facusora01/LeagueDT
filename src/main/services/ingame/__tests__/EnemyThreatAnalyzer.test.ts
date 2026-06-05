import { analyzeEnemyThreats } from '../EnemyThreatAnalyzer';
import type { LivePlayerStats } from '../types';

function makePlayer(overrides: Partial<LivePlayerStats> = {}): LivePlayerStats {
  return {
    summonerName: 'Player',
    championName: 'Ahri',
    team: 'CHAOS',
    position: 'MIDDLE',
    level: 8,
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 80,
    wardScore: 5,
    items: [],
    isDead: false,
    respawnTimer: 0,
    ...overrides,
  };
}

const allyTeam: LivePlayerStats[] = [
  makePlayer({ team: 'ORDER', kills: 2, deaths: 1, cs: 90, items: [1, 2] }),
  makePlayer({ team: 'ORDER', kills: 1, deaths: 2, cs: 70, items: [1] }),
];

describe('analyzeEnemyThreats', () => {
  test('returns one result per enemy', () => {
    const enemies = [makePlayer(), makePlayer({ summonerName: 'Enemy2' })];
    const result = analyzeEnemyThreats(enemies, allyTeam);
    expect(result).toHaveLength(2);
  });

  test('fed player (5 kills, 0 deaths) scores highest', () => {
    const fed = makePlayer({ summonerName: 'Fed', kills: 5, deaths: 0, assists: 3, items: [1, 2, 3] });
    const normal = makePlayer({ summonerName: 'Normal', kills: 1, deaths: 2, assists: 1 });
    const result = analyzeEnemyThreats([fed, normal], allyTeam);
    expect(result[0].summonerName).toBe('Fed');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  test('threat level matches score thresholds', () => {
    const extreme = makePlayer({ kills: 8, deaths: 0, assists: 5, items: [1, 2, 3, 4, 5], level: 16 });
    const result = analyzeEnemyThreats([extreme], allyTeam);
    expect(result[0].threatLevel).toBe('extreme');
  });

  test('player with 0/0/0 and no items is low threat', () => {
    const passive = makePlayer({ kills: 0, deaths: 0, assists: 0, items: [], cs: 20, level: 3 });
    const result = analyzeEnemyThreats([passive], allyTeam);
    expect(result[0].threatLevel).toBe('low');
  });

  test('scores are always between 0 and 100', () => {
    const enemies = [
      makePlayer({ kills: 0, deaths: 5, assists: 0 }),
      makePlayer({ kills: 15, deaths: 0, assists: 10, items: [1,2,3,4,5,6], level: 18 }),
    ];
    const result = analyzeEnemyThreats(enemies, allyTeam);
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  test('results are sorted by score descending', () => {
    const enemies = [
      makePlayer({ summonerName: 'A', kills: 0 }),
      makePlayer({ summonerName: 'B', kills: 7, deaths: 0, items: [1, 2, 3] }),
      makePlayer({ summonerName: 'C', kills: 2, deaths: 2 }),
    ];
    const result = analyzeEnemyThreats(enemies, allyTeam);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  test('each threat has at least one reason', () => {
    const enemies = [makePlayer({ kills: 4, deaths: 1 })];
    const result = analyzeEnemyThreats(enemies, allyTeam);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });

  test('kda is calculated correctly', () => {
    const enemy = makePlayer({ kills: 3, deaths: 2, assists: 4 });
    const result = analyzeEnemyThreats([enemy], allyTeam);
    expect(result[0].kda).toBeCloseTo(3.5);
  });

  test('kda with 0 deaths is kills + assists', () => {
    const enemy = makePlayer({ kills: 4, deaths: 0, assists: 6 });
    const result = analyzeEnemyThreats([enemy], allyTeam);
    expect(result[0].kda).toBe(10);
  });

  test('empty enemy list returns empty array', () => {
    expect(analyzeEnemyThreats([], allyTeam)).toHaveLength(0);
  });
});
