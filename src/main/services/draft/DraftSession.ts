import { EventEmitter } from 'events';
import { generateRecommendations, type ChampionData, type MasteryData, type ChampionRecommendation } from './ChampionRecommendationEngine';
import { generateBanSuggestions, type BanSuggestion } from './BanAdvisor';
import { recommendRunes, type RuneRecommendation } from './RuneRecommendationEngine';

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
  runeSuggestion: (runes: RuneRecommendation | null) => void;
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
  private simulating = false;
  private lastRuneChampId = 0;

  setStaticData(champions: ChampionData[], masteries: MasteryData[], meta: number[] = []) {
    this.allChampions = champions;
    this.masteries = masteries;
    this.highPriorityMeta = meta;
  }

  /** Called by LcuDraftDetector each time the LCU session event fires */
  updateFromLcu(lcuSession: any) {
    // A real champ-select session always takes precedence — clear any sim.
    const isRealSession = !!(
      lcuSession && (Array.isArray(lcuSession.myTeam) || Array.isArray(lcuSession.actions))
    );
    if (isRealSession) {
      this.simulating = false;
      this.applyLcu(lcuSession);
      return;
    }
    // No real session: keep an active simulation, otherwise apply (resets).
    if (this.simulating) return;
    this.applyLcu(lcuSession);
  }

  /** Dev-only: drive the session from a mock payload and lock out the poller. */
  simulate(lcuSession: any) {
    this.simulating = true;
    this.applyLcu(lcuSession);
  }

  private applyLcu(lcuSession: any) {
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

    // Walk through actions to collect bans, detect whose turn it is, and find
    // the action currently in progress (whoever the actor is). The in-progress
    // action's type is the source of truth for ban vs pick — `timer.phase`
    // strings vary across queue/draft types and aren't reliable.
    let inProgressType: 'ban' | 'pick' | null = null;
    for (const actionGroup of actions) {
      for (const action of actionGroup) {
        if (action.type === 'ban' && action.completed) {
          const actor = myTeam.find((p: any) => p.cellId === action.actorCellId);
          if (actor) allyBans.push(action.championId);
          else enemyBans.push(action.championId);
        }
        if (!action.completed && action.isInProgress) {
          inProgressType = action.type === 'ban' ? 'ban' : 'pick';
          if (action.actorCellId === localCellId) isMyTurn = true;
        }
      }
    }

    // A populated champ-select session is never "idle" — even when it's an
    // enemy's turn. Derive the phase from the in-progress action, falling back
    // to the timer only when nothing is actively in progress.
    const hasSession = myTeam.length > 0 || actions.length > 0;
    let phase: DraftPhase = 'idle';
    if (hasSession) {
      if (inProgressType === 'ban') phase = 'banning';
      else if (inProgressType === 'pick') phase = 'picking';
      else if (timer?.phase === 'FINALIZATION') phase = 'finished';
      else if (timer?.phase === 'PLANNING') phase = 'banning';
      else phase = 'picking';
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

    // Rune page for the local player's champion (re-emit only on change).
    const localChampId: number = myTeam.find((p: any) => p.cellId === localCellId)?.championId ?? 0;
    if (localChampId !== this.lastRuneChampId) {
      this.lastRuneChampId = localChampId;
      const champ = localChampId ? this.toChampionData(localChampId) : null;
      this.emit('runeSuggestion', champ ? recommendRunes(champ.tags) : null);
    }

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

  reset(force = false) {
    // Ignore the real poller's resets while a simulation is active.
    if (this.simulating && !force) return;
    this.simulating = false;
    this.lastRuneChampId = 0;
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
