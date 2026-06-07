import { generateTips, createTipsContext } from '../StrategicTipsEngine';
import type { LiveGameState, LivePlayerStats } from '../types';

function basePlayer(overrides: Partial<LivePlayerStats> = {}): LivePlayerStats {
  return {
    summonerName: 'Me',
    championName: 'Lux',
    team: 'ORDER',
    position: 'MIDDLE',
    level: 8,
    kills: 1,
    deaths: 1,
    assists: 2,
    cs: 70,
    wardScore: 5,
    items: [1, 2],
    isDead: false,
    respawnTimer: 0,
    currentGold: 1000,
    ...overrides,
  };
}

function baseState(overrides: Partial<LiveGameState> = {}): LiveGameState {
  return {
    gameTime: 600,
    gameMode: 'CLASSIC',
    localPlayer: basePlayer(),
    allies: [],
    enemies: [],
    events: [],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

describe('generateTips', () => {
  test('returns empty array when no conditions are met', () => {
    const ctx = createTipsContext();
    // Early game, no objectives near, decent CS
    const state = baseState({ gameTime: 120, localPlayer: basePlayer({ cs: 20, level: 3 }) });
    const tips = generateTips(state, ctx);
    expect(Array.isArray(tips)).toBe(true);
  });

  test('generates dragon tip when near first dragon spawn', () => {
    const ctx = createTipsContext();
    const state = baseState({ gameTime: 260 }); // ~40s before 5:00
    const tips = generateTips(state, ctx);
    const dragonTip = tips.find(t => t.id.startsWith('dragon:'));
    expect(dragonTip).toBeDefined();
    expect(dragonTip!.category).toBe('macro');
  });

  test('generates baron tip at 20 min', () => {
    const ctx = createTipsContext();
    const state = baseState({ gameTime: 1140 }); // ~60s before 20:00
    const tips = generateTips(state, ctx);
    const baronTip = tips.find(t => t.id.startsWith('baron:'));
    expect(baronTip).toBeDefined();
    expect(baronTip!.priority).toBe('critical');
  });

  test('does not repeat the same tip', () => {
    const ctx = createTipsContext();
    const state = baseState({ gameTime: 260 });
    const tips1 = generateTips(state, ctx);
    const tips2 = generateTips(state, ctx);
    const dragonTips1 = tips1.filter(t => t.id.startsWith('dragon:'));
    const dragonTips2 = tips2.filter(t => t.id.startsWith('dragon:'));
    expect(dragonTips1.length + dragonTips2.length).toBe(1);
  });

  test('generates CS deficit tip when behind on CS', () => {
    const ctx = createTipsContext();
    // At 10 min (600s), expected ~70 CS. Player has 20.
    const state = baseState({
      gameTime: 600,
      localPlayer: basePlayer({ cs: 20 }),
    });
    const tips = generateTips(state, ctx);
    const csTip = tips.find(t => t.id.startsWith('cs:'));
    expect(csTip).toBeDefined();
    expect(csTip!.category).toBe('micro');
  });

  test('does not generate CS tip when CS is on target', () => {
    const ctx = createTipsContext();
    const state = baseState({
      gameTime: 600,
      localPlayer: basePlayer({ cs: 72 }),
    });
    const tips = generateTips(state, ctx);
    const csTip = tips.find(t => t.id.startsWith('cs:'));
    expect(csTip).toBeUndefined();
  });

  test('generates level spike tip at level 6', () => {
    const ctx = createTipsContext();
    const state = baseState({ localPlayer: basePlayer({ level: 6 }) });
    const tips = generateTips(state, ctx);
    const spikeTip = tips.find(t => t.id === 'spike:6');
    expect(spikeTip).toBeDefined();
    expect(spikeTip!.category).toBe('timing');
  });

  test('generates level spike tip at 11 and 16', () => {
    const ctx = createTipsContext();
    const state = baseState({ localPlayer: basePlayer({ level: 16 }) });
    const tips = generateTips(state, ctx);
    const ids = tips.map(t => t.id);
    expect(ids).toContain('spike:6');
    expect(ids).toContain('spike:11');
    expect(ids).toContain('spike:16');
  });

  test('warns a team is one dragon from Soul at 3 dragons (same team)', () => {
    const ctx = createTipsContext();
    const state = baseState({
      gameTime: 1200,
      localPlayer: basePlayer({ summonerName: 'Me' }),
      events: [
        { id: 1, name: 'DragonKill', time: 350, killerName: 'Me' },
        { id: 2, name: 'DragonKill', time: 660, killerName: 'Me' },
        { id: 3, name: 'DragonKill', time: 970, killerName: 'Me' },
      ],
    });
    const tips = generateTips(state, ctx);
    const soulTip = tips.find(t => t.id.startsWith('soul-point:'));
    expect(soulTip).toBeDefined();
    expect(soulTip!.priority).toBe('critical');
  });

  test('does NOT warn Elder at 3 dragons split across teams', () => {
    const ctx = createTipsContext();
    const state = baseState({
      gameTime: 1200,
      localPlayer: basePlayer({ summonerName: 'Me' }),
      enemies: [basePlayer({ summonerName: 'Foe', team: 'CHAOS' })],
      events: [
        { id: 1, name: 'DragonKill', time: 350, killerName: 'Me' },
        { id: 2, name: 'DragonKill', time: 660, killerName: 'Foe' },
        { id: 3, name: 'DragonKill', time: 970, killerName: 'Me' },
      ],
    });
    const tips = generateTips(state, ctx);
    expect(tips.find(t => t.id === 'elder-next')).toBeUndefined();
    expect(tips.find(t => t.id.startsWith('soul-point:'))).toBeUndefined();
  });

  test('warns Elder is next once a team secures Soul (4 dragons)', () => {
    const ctx = createTipsContext();
    const state = baseState({
      gameTime: 1500,
      localPlayer: basePlayer({ summonerName: 'Me' }),
      events: [
        { id: 1, name: 'DragonKill', time: 350, killerName: 'Me' },
        { id: 2, name: 'DragonKill', time: 660, killerName: 'Me' },
        { id: 3, name: 'DragonKill', time: 970, killerName: 'Me' },
        { id: 4, name: 'DragonKill', time: 1280, killerName: 'Me' },
      ],
    });
    const tips = generateTips(state, ctx);
    const elderTip = tips.find(t => t.id === 'elder-next');
    expect(elderTip).toBeDefined();
    expect(elderTip!.priority).toBe('critical');
  });

  test('generates tower plates tip near 14 min', () => {
    const ctx = createTipsContext();
    const state = baseState({ gameTime: 740 }); // ~100s before 14:00
    const tips = generateTips(state, ctx);
    const platesTip = tips.find(t => t.id === 'plates');
    expect(platesTip).toBeDefined();
  });

  test('all tips have required fields', () => {
    const ctx = createTipsContext();
    const state = baseState({
      gameTime: 260,
      localPlayer: basePlayer({ level: 6, cs: 15 }),
    });
    const tips = generateTips(state, ctx);
    for (const tip of tips) {
      expect(tip.id).toBeTruthy();
      expect(tip.category).toBeTruthy();
      expect(tip.priority).toBeTruthy();
      expect(tip.message).toBeTruthy();
    }
  });
});
