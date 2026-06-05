import axios from 'axios';
import https from 'https';
import { EventEmitter } from 'events';
import type { LiveGameState, LivePlayerStats, LiveGameEvent } from './types';
import { analyzeEnemyThreats } from './EnemyThreatAnalyzer';
import { recommendItems, type ItemInput } from './ItemRecommendationEngine';
import { generateTips, createTipsContext } from './StrategicTipsEngine';

const LIVE_CLIENT_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
const POLL_INTERVAL_MS = 3000;

// Self-signed cert on port 2999
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export class LiveMatchTracker extends EventEmitter {
  private pollTimer: NodeJS.Timeout | null = null;
  private isTracking = false;
  private lastEventIds = new Set<number>();
  private tipsCtx = createTipsContext();

  // Champion tags for local player — set before game starts via setLocalChampionTags()
  private localChampionTags: string[] = [];

  setLocalChampionTags(tags: string[]) {
    this.localChampionTags = tags;
  }

  start() {
    if (this.pollTimer) return;
    this.tipsCtx = createTipsContext();
    this.lastEventIds.clear();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.poll();
    console.log('[LiveMatchTracker] Started polling');
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.isTracking) {
      this.isTracking = false;
      this.emit('gameEnded');
      console.log('[LiveMatchTracker] Stopped');
    }
  }

  private async poll() {
    try {
      const raw = await axios.get(LIVE_CLIENT_URL, { httpsAgent, timeout: 2000 });
      const state = this.parseState(raw.data);

      if (!this.isTracking) {
        this.isTracking = true;
        this.emit('gameStarted', state);
      }

      this.emit('stateUpdated', state);

      // Emit coach outputs
      const threats = analyzeEnemyThreats(state.enemies, state.allies);
      this.emit('threatsUpdated', threats);

      const goldAdv = this.estimateGoldAdvantage(state);
      const itemInput: ItemInput = {
        championTags: this.localChampionTags,
        ownedItemIds: state.localPlayer.items,
        currentGold: state.localPlayer.currentGold ?? 0,
        gameTime: state.gameTime,
        goldAdvantage: goldAdv,
        enemyADCount: this.countTaggedEnemies(state.enemies, ['Marksman', 'Fighter', 'Assassin']),
        enemyAPCount: this.countTaggedEnemies(state.enemies, ['Mage']),
        enemyHasHealing: false, // TODO: detect via champion list
      };
      this.emit('itemsUpdated', recommendItems(itemInput));

      const newTips = generateTips(state, this.tipsCtx);
      if (newTips.length > 0) {
        this.emit('tipsUpdated', newTips);
      }
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ECONNREFUSED') {
        if (this.isTracking) this.stop();
      }
      // else: transient error, ignore
    }
  }

  private parseState(raw: any): LiveGameState {
    const local = raw.activePlayer;
    const allPlayers: any[] = raw.allPlayers ?? [];

    const localName: string = local.summonerName ?? '';
    const localRaw = allPlayers.find((p: any) => p.summonerName === localName) ?? allPlayers[0];
    const localTeam: 'ORDER' | 'CHAOS' = localRaw?.team ?? 'ORDER';

    const allies: LivePlayerStats[] = [];
    const enemies: LivePlayerStats[] = [];

    for (const p of allPlayers) {
      const parsed = this.parsePlayer(p);
      if (p.summonerName === localName) continue;
      if (p.team === localTeam) allies.push(parsed);
      else enemies.push(parsed);
    }

    const localPlayer: LivePlayerStats = {
      ...this.parsePlayer(localRaw ?? {}),
      currentGold: local.currentGold ?? 0,
    };

    // Only forward new events
    const allEvents: LiveGameEvent[] = (raw.events?.Events ?? []).map((e: any) => ({
      id: e.EventID,
      name: e.EventName,
      time: e.EventTime,
      killerName: e.KillerName,
      victimName: e.VictimName,
      assisters: e.Assisters,
      dragonType: e.DragonType,
      turretKilled: e.TurretKilled,
    }));

    const newEvents = allEvents.filter(e => !this.lastEventIds.has(e.id));
    newEvents.forEach(e => this.lastEventIds.add(e.id));
    if (newEvents.length > 0) this.emit('newEvents', newEvents);

    return {
      gameTime: raw.gameData?.gameTime ?? 0,
      gameMode: raw.gameData?.gameMode ?? 'CLASSIC',
      localPlayer,
      allies,
      enemies,
      events: allEvents,
      lastUpdated: Date.now(),
    };
  }

  private parsePlayer(p: any): LivePlayerStats {
    return {
      summonerName: p.summonerName ?? '',
      championName: p.championName ?? '',
      team: p.team ?? 'ORDER',
      position: p.position ?? '',
      level: p.level ?? 1,
      kills: p.scores?.kills ?? 0,
      deaths: p.scores?.deaths ?? 0,
      assists: p.scores?.assists ?? 0,
      cs: p.scores?.creepScore ?? 0,
      wardScore: p.scores?.wardScore ?? 0,
      items: (p.items ?? []).map((i: any) => i.itemID ?? i),
      isDead: p.isDead ?? false,
      respawnTimer: p.respawnTimer ?? 0,
    };
  }

  private estimateGoldAdvantage(state: LiveGameState): number {
    const myGold = state.localPlayer.currentGold ?? 0;
    if (state.enemies.length === 0) return 0;
    // Rough: compare local player's liquid gold vs enemies' average
    const enemyAvgItems = state.enemies.reduce((s, e) => s + e.items.length, 0) / state.enemies.length;
    const myItems = state.localPlayer.items.length;
    return (myItems - enemyAvgItems) * 2800 + myGold;
  }

  private countTaggedEnemies(_enemies: LivePlayerStats[], _tags: string[]): number {
    // Without champion→tags lookup at runtime, return a heuristic count
    // This gets populated properly when champion tags are loaded
    return _enemies.length;
  }
}
