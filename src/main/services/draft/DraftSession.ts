import { EventEmitter } from 'events';
import { generateRecommendations, type ChampionData, type MasteryData, type ChampionRecommendation } from './ChampionRecommendationEngine';
import { generateBanSuggestions, type BanSuggestion } from './BanAdvisor';

export type DraftPhase = 'idle' | 'banning' | 'picking' | 'finished';

export interface DraftState {
  phase: DraftPhase;
  allyPicks: ChampionData[];
  enemyPicks: ChampionData[];
  allyBans: number[];
  enemyBans: number[];
  localCellId: number;
  isMyTurn: boolean;
}

export interface DraftSessionEvents {
  stateChanged: (state: DraftState) => void;
  recommendations: (recs: ChampionRecommendation[]) => void;
  banSuggestions: (bans: BanSuggestion[]) => void;
}

export class DraftSession extends EventEmitter {
  private state: DraftState = {
    phase: 'idle',
    allyPicks: [],
    enemyPicks: [],
    allyBans: [],
    enemyBans: [],
    localCellId: 0,
    isMyTurn: false,
  };

  private allChampions: ChampionData[] = [];
  private masteries: MasteryData[] = [];
  private highPriorityMeta: number[] = [];

  setStaticData(champions: ChampionData[], masteries: MasteryData[], meta: number[] = []) {
    this.allChampions = champions;
    this.masteries = masteries;
    this.highPriorityMeta = meta;
  }

  /** Called by LcuDraftDetector each time the LCU session event fires */
  updateFromLcu(lcuSession: any) {
    if (!lcuSession) {
      this.reset();
      return;
    }

    const myTeam: any[] = lcuSession.myTeam ?? [];
    const theirTeam: any[] = lcuSession.theirTeam ?? [];
    const actions: any[][] = lcuSession.actions ?? [];
    const localCellId: number = lcuSession.localPlayerCellId ?? 0;
    const timer = lcuSession.timer;

    const allyBans: number[] = [];
    const enemyBans: number[] = [];
    let isMyTurn = false;
    let phase: DraftPhase = 'idle';

    // Determine phase and whose turn it is
    if (timer?.phase === 'BAN_PICK') {
      phase = 'picking';
    } else if (timer?.phase === 'PLANNING') {
      phase = 'banning';
    }

    // Walk through actions to find bans and detect active turn
    for (const actionGroup of actions) {
      for (const action of actionGroup) {
        if (action.type === 'ban' && action.completed) {
          const actor = myTeam.find((p: any) => p.cellId === action.actorCellId);
          if (actor) allyBans.push(action.championId);
          else enemyBans.push(action.championId);
        }
        if (!action.completed && action.isInProgress && action.actorCellId === localCellId) {
          isMyTurn = true;
          phase = action.type === 'ban' ? 'banning' : 'picking';
        }
      }
    }

    const allyPicks = myTeam
      .filter((p: any) => p.championId && p.championId !== 0)
      .map((p: any) => this.toChampionData(p.championId))
      .filter((c): c is ChampionData => c !== null);

    const enemyPicks = theirTeam
      .filter((p: any) => p.championId && p.championId !== 0)
      .map((p: any) => this.toChampionData(p.championId))
      .filter((c): c is ChampionData => c !== null);

    const prevPhase = this.state.phase;
    this.state = { phase, allyPicks, enemyPicks, allyBans, enemyBans, localCellId, isMyTurn };
    this.emit('stateChanged', this.state);

    // Generate recommendations when it's our turn
    if (isMyTurn || phase !== prevPhase) {
      this.computeRecommendations();
    }
  }

  private computeRecommendations() {
    const { allyPicks, enemyPicks, allyBans, enemyBans, phase } = this.state;
    const allBanned = [...allyBans, ...enemyBans];

    if (phase === 'picking' || phase === 'idle') {
      const recs = generateRecommendations({
        allyPicks,
        enemyPicks,
        availableChampions: this.allChampions,
        masteries: this.masteries,
        bannedIds: allBanned,
      });
      this.emit('recommendations', recs);
    }

    if (phase === 'banning') {
      const bans = generateBanSuggestions({
        allyPicks,
        enemyPicks,
        allChampions: this.allChampions,
        allyMasteries: this.masteries,
        alreadyBanned: allBanned,
        highPriorityMeta: this.highPriorityMeta,
      });
      this.emit('banSuggestions', bans);
    }
  }

  private toChampionData(championId: number): ChampionData | null {
    return this.allChampions.find(c => c.id === championId) ?? null;
  }

  reset() {
    this.state = {
      phase: 'idle',
      allyPicks: [],
      enemyPicks: [],
      allyBans: [],
      enemyBans: [],
      localCellId: 0,
      isMyTurn: false,
    };
    this.emit('stateChanged', this.state);
  }

  getState(): DraftState {
    return { ...this.state };
  }
}
