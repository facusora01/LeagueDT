// ─── Live Client API shapes ───────────────────────────────────────────────────

export interface LivePlayerStats {
  summonerName: string;
  championName: string;
  team: 'ORDER' | 'CHAOS';
  position: string;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  wardScore: number;
  items: number[];        // item IDs currently owned
  isDead: boolean;
  respawnTimer: number;
  currentGold?: number;  // only available for local player
}

export interface LiveGameEvent {
  id: number;
  name: string;           // 'DragonKill' | 'BaronKill' | 'ChampionKill' | 'TurretKilled' | ...
  time: number;
  killerName?: string;
  victimName?: string;
  assisters?: string[];
  dragonType?: string;    // 'Fire' | 'Earth' | 'Water' | 'Air' | 'Hextech' | 'Chemtech' | 'Elder'
  turretKilled?: string;
}

export interface LiveGameState {
  gameTime: number;       // seconds
  gameMode: string;
  localPlayer: LivePlayerStats;
  allies: LivePlayerStats[];   // excludes local player
  enemies: LivePlayerStats[];
  events: LiveGameEvent[];
  lastUpdated: number;    // Date.now()
}

// ─── Coach outputs ────────────────────────────────────────────────────────────

export type ThreatLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface EnemyThreat {
  summonerName: string;
  championName: string;
  threatLevel: ThreatLevel;
  score: number;          // 0–100
  reasons: string[];
  kda: number;
  estimatedGoldLead: number;
}

export type GamePhase = 'early' | 'mid' | 'late';

export interface ItemSuggestion {
  itemId: number;
  name: string;
  priority: 'core' | 'situational' | 'defensive';
  reason: string;
}

export interface ItemSwap {
  outItemId: number;          // currently owned item to replace
  in: ItemSuggestion;         // suggested replacement
}

export interface ItemBuildRecommendation {
  phase: GamePhase;
  buildStyle: 'aggressive' | 'defensive' | 'balanced' | 'anti-heal';
  items: ItemSuggestion[];    // items to buy (free slots available)
  swaps: ItemSwap[];          // replacements when the build is full
  reasoning: string;
}

export type TipCategory = 'macro' | 'micro' | 'vision' | 'timing' | 'threat';
export type TipPriority = 'low' | 'medium' | 'high' | 'critical';

export interface StrategicTip {
  id: string;
  category: TipCategory;
  priority: TipPriority;
  message: string;
  expiresAt?: number;     // game time (seconds) when tip becomes stale
}
