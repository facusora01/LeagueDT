"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftSession = void 0;
const events_1 = require("events");
const ChampionRecommendationEngine_1 = require("./ChampionRecommendationEngine");
const BanAdvisor_1 = require("./BanAdvisor");
class DraftSession extends events_1.EventEmitter {
    state = {
        phase: 'idle',
        allyPicks: [],
        enemyPicks: [],
        allyBans: [],
        enemyBans: [],
        localCellId: 0,
        isMyTurn: false,
    };
    allChampions = [];
    masteries = [];
    highPriorityMeta = [];
    setStaticData(champions, masteries, meta = []) {
        this.allChampions = champions;
        this.masteries = masteries;
        this.highPriorityMeta = meta;
    }
    /** Called by LcuDraftDetector each time the LCU session event fires */
    updateFromLcu(lcuSession) {
        if (!lcuSession) {
            this.reset();
            return;
        }
        const myTeam = lcuSession.myTeam ?? [];
        const theirTeam = lcuSession.theirTeam ?? [];
        const actions = lcuSession.actions ?? [];
        const localCellId = lcuSession.localPlayerCellId ?? 0;
        const timer = lcuSession.timer;
        const allyBans = [];
        const enemyBans = [];
        let isMyTurn = false;
        let phase = 'idle';
        // Determine phase and whose turn it is
        if (timer?.phase === 'BAN_PICK') {
            phase = 'picking';
        }
        else if (timer?.phase === 'PLANNING') {
            phase = 'banning';
        }
        // Walk through actions to find bans and detect active turn
        for (const actionGroup of actions) {
            for (const action of actionGroup) {
                if (action.type === 'ban' && action.completed) {
                    const actor = myTeam.find((p) => p.cellId === action.actorCellId);
                    if (actor)
                        allyBans.push(action.championId);
                    else
                        enemyBans.push(action.championId);
                }
                if (!action.completed && action.isInProgress && action.actorCellId === localCellId) {
                    isMyTurn = true;
                    phase = action.type === 'ban' ? 'banning' : 'picking';
                }
            }
        }
        const allyPicks = myTeam
            .filter((p) => p.championId && p.championId !== 0)
            .map((p) => this.toChampionData(p.championId))
            .filter((c) => c !== null);
        const enemyPicks = theirTeam
            .filter((p) => p.championId && p.championId !== 0)
            .map((p) => this.toChampionData(p.championId))
            .filter((c) => c !== null);
        const prevPhase = this.state.phase;
        this.state = { phase, allyPicks, enemyPicks, allyBans, enemyBans, localCellId, isMyTurn };
        this.emit('stateChanged', this.state);
        // Generate recommendations when it's our turn
        if (isMyTurn || phase !== prevPhase) {
            this.computeRecommendations();
        }
    }
    computeRecommendations() {
        const { allyPicks, enemyPicks, allyBans, enemyBans, phase } = this.state;
        const allBanned = [...allyBans, ...enemyBans];
        if (phase === 'picking' || phase === 'idle') {
            const recs = (0, ChampionRecommendationEngine_1.generateRecommendations)({
                allyPicks,
                enemyPicks,
                availableChampions: this.allChampions,
                masteries: this.masteries,
                bannedIds: allBanned,
            });
            this.emit('recommendations', recs);
        }
        if (phase === 'banning') {
            const bans = (0, BanAdvisor_1.generateBanSuggestions)({
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
    toChampionData(championId) {
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
    getState() {
        return { ...this.state };
    }
}
exports.DraftSession = DraftSession;
