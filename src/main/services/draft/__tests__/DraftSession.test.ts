import { DraftSession } from '../DraftSession';
import type { ChampionData, MasteryData } from '../ChampionRecommendationEngine';

const CHAMPIONS: ChampionData[] = [
  { id: 1, name: 'Tank1', tags: ['Tank'] },
  { id: 2, name: 'Mage1', tags: ['Mage'] },
  { id: 3, name: 'ADC1', tags: ['Marksman'] },
  { id: 4, name: 'Support1', tags: ['Support'] },
  { id: 5, name: 'Assassin1', tags: ['Assassin'] },
];

const MASTERIES: MasteryData[] = [
  { championId: 3, level: 7, points: 250000 },
];

describe('DraftSession', () => {
  let session: DraftSession;

  beforeEach(() => {
    session = new DraftSession();
    session.setStaticData(CHAMPIONS, MASTERIES);
  });

  test('starts in idle phase', () => {
    expect(session.getState().phase).toBe('idle');
  });

  test('reset returns to idle with empty picks', () => {
    session.reset();
    const state = session.getState();
    expect(state.phase).toBe('idle');
    expect(state.allyPicks).toHaveLength(0);
    expect(state.enemyPicks).toHaveLength(0);
  });

  test('updateFromLcu null resets session', () => {
    session.updateFromLcu(null);
    expect(session.getState().phase).toBe('idle');
  });

  test('emits stateChanged when updated', done => {
    session.on('stateChanged', state => {
      expect(state).toBeDefined();
      done();
    });
    session.updateFromLcu(null);
  });

  test('parses ally and enemy picks from LCU session', () => {
    const lcuSession = {
      localPlayerCellId: 0,
      timer: { phase: 'BAN_PICK' },
      myTeam: [
        { cellId: 0, championId: 1 }, // Tank1
        { cellId: 1, championId: 2 }, // Mage1
      ],
      theirTeam: [
        { cellId: 5, championId: 3 }, // ADC1
      ],
      actions: [],
    };

    session.updateFromLcu(lcuSession);
    const state = session.getState();

    expect(state.allyPicks).toHaveLength(2);
    expect(state.enemyPicks).toHaveLength(1);
    expect(state.allyPicks[0].id).toBe(1);
    expect(state.enemyPicks[0].id).toBe(3);
  });

  test('detects ban phase when action type is ban and isInProgress', () => {
    const lcuSession = {
      localPlayerCellId: 0,
      timer: { phase: 'BAN_PICK' },
      myTeam: [{ cellId: 0, championId: 0 }],
      theirTeam: [],
      actions: [[
        { type: 'ban', completed: false, isInProgress: true, actorCellId: 0, championId: 0 },
      ]],
    };

    session.updateFromLcu(lcuSession);
    expect(session.getState().phase).toBe('banning');
    expect(session.getState().isMyTurn).toBe(true);
  });

  test('detects pick phase when action type is pick and isInProgress', () => {
    const lcuSession = {
      localPlayerCellId: 0,
      timer: { phase: 'BAN_PICK' },
      myTeam: [{ cellId: 0, championId: 0 }],
      theirTeam: [],
      actions: [[
        { type: 'pick', completed: false, isInProgress: true, actorCellId: 0, championId: 0 },
      ]],
    };

    session.updateFromLcu(lcuSession);
    expect(session.getState().phase).toBe('picking');
    expect(session.getState().isMyTurn).toBe(true);
  });

  test('emits recommendations during pick phase', done => {
    session.on('recommendations', recs => {
      expect(Array.isArray(recs)).toBe(true);
      done();
    });

    session.updateFromLcu({
      localPlayerCellId: 0,
      timer: { phase: 'BAN_PICK' },
      myTeam: [{ cellId: 0, championId: 0 }],
      theirTeam: [],
      actions: [[
        { type: 'pick', completed: false, isInProgress: true, actorCellId: 0, championId: 0 },
      ]],
    });
  });

  test('emits banSuggestions during ban phase', done => {
    session.on('banSuggestions', bans => {
      expect(Array.isArray(bans)).toBe(true);
      done();
    });

    session.updateFromLcu({
      localPlayerCellId: 0,
      timer: { phase: 'BAN_PICK' },
      myTeam: [{ cellId: 0, championId: 0 }],
      theirTeam: [],
      actions: [[
        { type: 'ban', completed: false, isInProgress: true, actorCellId: 0, championId: 0 },
      ]],
    });
  });
});
