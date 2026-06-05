// ─── Electron IPC API ────────────────────────────────────────────────────────

export interface ElectronAPI {
  // Core
  ping: () => Promise<string>;
  getLcuStatus: () => Promise<'connected' | 'disconnected'>;
  onLcuStatusChange: (cb: (status: 'connected' | 'disconnected') => void) => void;
  // Settings
  getSettings: () => Promise<any>;
  updateSettings: (settings: any) => Promise<any>;
  // Riot API
  setApiKey: (key: string) => Promise<{ ok: boolean }>;
  // Summoner
  searchSummoner: (name: string, tag: string, region: string) => Promise<Summoner>;
  getAllSummoners: () => Promise<Summoner[]>;
  // Mastery
  syncMastery: (summonerId: string) => Promise<{ synced: number }>;
  getMastery: (summonerId: string) => Promise<ChampionMastery[]>;
  // Champions
  getAllChampions: () => Promise<Champion[]>;
  getChampionById: (id: number) => Promise<Champion | null>;
  // Match History
  syncMatches: (summonerId: string, count?: number) => Promise<{ found: number; saved: number }>;
  getMatches: (summonerId: string, limit?: number) => Promise<any[]>;
  // DataDragon
  getDDVersion: () => Promise<string | null>;
  // In-Game Coach
  startIngameCoach: () => Promise<{ ok: boolean }>;
  stopIngameCoach: () => Promise<{ ok: boolean }>;
  onGameStarted: (cb: (s: GameStateDTO) => void) => void;
  onGameStateUpdate: (cb: (s: GameStateDTO) => void) => void;
  onGameEnded: (cb: () => void) => void;
  onThreatsUpdate: (cb: (t: ThreatDTO[]) => void) => void;
  onItemsUpdate: (cb: (r: ItemBuildDTO) => void) => void;
  onTipsUpdate: (cb: (t: TipDTO[]) => void) => void;
  onGameEvents: (cb: (e: any[]) => void) => void;
  // Draft
  getDraftState: () => Promise<DraftStateDTO>;
  onDraftStateChanged: (cb: (state: DraftStateDTO) => void) => void;
  onDraftRecommendations: (cb: (recs: ChampionRecDTO[]) => void) => void;
  onDraftBanSuggestions: (cb: (bans: BanSugDTO[]) => void) => void;
}

// ─── Renderer DTOs (shapes pushed over IPC) ──────────────────────────────────

export interface ChampionDataDTO {
  id: number;
  name: string;
  tags: string[];
}

export interface DraftStateDTO {
  phase: 'idle' | 'banning' | 'picking' | 'finished';
  allyPicks: ChampionDataDTO[];
  enemyPicks: ChampionDataDTO[];
  allyBans: number[];
  enemyBans: number[];
  localCellId: number;
  isMyTurn: boolean;
}

export interface ChampionRecDTO {
  champion: ChampionDataDTO;
  score: number;
  reasons: string[];
  masteryLevel: number;
  masteryPoints: number;
  fillsRole: string | null;
}

export interface BanSugDTO {
  champion: ChampionDataDTO;
  score: number;
  reasons: string[];
}

export interface LivePlayerDTO {
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
  items: number[];
  isDead: boolean;
  respawnTimer: number;
  currentGold?: number;
}

export interface GameStateDTO {
  gameTime: number;
  gameMode: string;
  localPlayer: LivePlayerDTO;
  allies: LivePlayerDTO[];
  enemies: LivePlayerDTO[];
  events: any[];
  lastUpdated: number;
}

export interface ThreatDTO {
  summonerName: string;
  championName: string;
  threatLevel: 'low' | 'medium' | 'high' | 'extreme';
  score: number;
  reasons: string[];
  kda: number;
  estimatedGoldLead: number;
}

export interface ItemSuggestionDTO {
  itemId: number;
  name: string;
  priority: 'core' | 'situational' | 'defensive';
  reason: string;
}

export interface ItemBuildDTO {
  phase: 'early' | 'mid' | 'late';
  buildStyle: 'aggressive' | 'defensive' | 'balanced' | 'anti-heal';
  items: ItemSuggestionDTO[];
  reasoning: string;
}

export interface TipDTO {
  id: string;
  category: 'macro' | 'micro' | 'vision' | 'timing' | 'threat';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  expiresAt?: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum RecommendationType {
  CHAMPION_PICK = 'CHAMPION_PICK',
  CHAMPION_BAN = 'CHAMPION_BAN',
  ITEM_PURCHASE = 'ITEM_PURCHASE',
  STRATEGIC_TIP = 'STRATEGIC_TIP',
  OBJECTIVE_TIMING = 'OBJECTIVE_TIMING',
  POSITIONING = 'POSITIONING',
  VISION = 'VISION',
}

export enum RecommendationContext {
  CHAMPION_SELECT = 'CHAMPION_SELECT',
  EARLY_GAME = 'EARLY_GAME',
  MID_GAME = 'MID_GAME',
  LATE_GAME = 'LATE_GAME',
  TEAMFIGHT = 'TEAMFIGHT',
  SPLIT_PUSH = 'SPLIT_PUSH',
}

export enum OverlayPosition {
  TOP_LEFT = 'TOP_LEFT',
  TOP_RIGHT = 'TOP_RIGHT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
}

export enum RecommendationLevel {
  BASIC = 'BASIC',
  DETAILED = 'DETAILED',
  ADVANCED = 'ADVANCED',
}

export enum Role {
  TOP = 'TOP',
  JUNGLE = 'JUNGLE',
  MID = 'MID',
  ADC = 'ADC',
  SUPPORT = 'SUPPORT',
}

// ─── Summoner ─────────────────────────────────────────────────────────────────

export interface Summoner {
  id: string;
  puuid: string;
  accountId: string;
  summonerId: string;
  name: string;
  tagLine: string;
  profileIconId: number;
  level: number;
  region: string;
  lastUpdated: Date;
  createdAt: Date;
}

// ─── Champion ─────────────────────────────────────────────────────────────────

export interface ChampionInfo {
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
}

export interface ChampionStats {
  hp: number;
  hpPerLevel: number;
  mp: number;
  mpPerLevel: number;
  moveSpeed: number;
  armor: number;
  armorPerLevel: number;
  spellBlock: number;
  spellBlockPerLevel: number;
  attackRange: number;
  hpRegen: number;
  hpRegenPerLevel: number;
  mpRegen: number;
  mpRegenPerLevel: number;
  crit: number;
  critPerLevel: number;
  attackDamage: number;
  attackDamagePerLevel: number;
  attackSpeedPerLevel: number;
  attackSpeed: number;
}

export interface Champion {
  id: number;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  info: ChampionInfo;
  stats: ChampionStats;
  version: string;
}

// ─── Champion Mastery ─────────────────────────────────────────────────────────

export interface ChampionMastery {
  id: string;
  summonerId: string;
  championId: number;
  level: number;
  points: number;
  lastPlayTime: Date;
  chestGranted: boolean;
  tokensEarned: number;
}

// ─── Match ────────────────────────────────────────────────────────────────────

export interface ChampionBan {
  championId: number;
  pickTurn: number;
}

export interface StatPerks {
  defense: number;
  flex: number;
  offense: number;
}

export interface Team {
  id: string;
  matchId: string;
  teamId: number;
  win: boolean;
  firstBlood: boolean;
  firstTower: boolean;
  firstInhibitor: boolean;
  firstBaron: boolean;
  firstDragon: boolean;
  firstRiftHerald: boolean;
  towerKills: number;
  inhibitorKills: number;
  baronKills: number;
  dragonKills: number;
  riftHeraldKills: number;
  bans: ChampionBan[];
}

export interface Participant {
  id: string;
  matchId: string;
  teamId: number;
  championId: number;
  summonerId: string | null;
  summonerName: string;
  participantId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  goldSpent: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  totalHeal: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  creepScore: number;
  neutralMinionsKilled: number;
  teamObjectiveKills: number;
  win: boolean;
  items: number[];
  perk0: number;
  perk1: number;
  perk2: number;
  perk3: number;
  perk4: number;
  perk5: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
  statPerks: StatPerks;
  role: string;
  lane: string;
}

export interface Match {
  id: string;
  gameId: bigint;
  platformId: string;
  queueId: number;
  mapId: number;
  seasonId: number;
  gameCreation: Date;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  createdAt: Date;
  teams: Team[];
  participants: Participant[];
}

// ─── Items ────────────────────────────────────────────────────────────────────

export interface ItemGold {
  base: number;
  total: number;
  sell: number;
  purchaseable: boolean;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  plaintext: string;
  into: number[];
  from: number[];
  gold: ItemGold;
  tags: string[];
  stats: Record<string, number>;
  version: string;
}

// ─── Runes ────────────────────────────────────────────────────────────────────

export interface Rune {
  id: number;
  key: string;
  name: string;
  icon: string;
  shortDesc: string;
  longDesc: string;
  tier: number;
  type: string;
  version: string;
}

// ─── Live Match ───────────────────────────────────────────────────────────────

export interface LiveChampionBan {
  championId: number;
  teamId: number;
  pickTurn: number;
}

export interface LiveParticipant {
  id: string;
  liveMatchId: string;
  teamId: number;
  championId: number;
  summonerId: string;
  summonerName: string;
  spell1Id: number;
  spell2Id: number;
  perk0: number;
  perk1: number;
  perk2: number;
  perk3: number;
  perk4: number;
  perk5: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
  isBot: boolean;
  isDead: boolean;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  level: number;
  items: number[];
}

export interface LiveMatch {
  id: string;
  gameId: bigint;
  mapId: number;
  gameMode: string;
  gameType: string;
  gameQueueConfigId: number;
  gameStartTime: Date;
  gameLength: number;
  platformId: string;
  createdAt: Date;
  updatedAt: Date;
  participants: LiveParticipant[];
  bannedChampions: LiveChampionBan[];
}

// ─── Recommendation ───────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  summonerId: string;
  type: RecommendationType;
  context: RecommendationContext;
  priority: number;
  title: string;
  description: string;
  reasoning: string;
  data: Record<string, unknown>;
  confidence: number;
  timestamp: Date;
  dismissed: boolean;
  actedUpon: boolean;
  matchId?: string;
}

// ─── User Statistics ──────────────────────────────────────────────────────────

export interface ChampionPlayStats {
  championId: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  averageKDA: number;
}

export interface RoleDistribution {
  TOP: number;
  JUNGLE: number;
  MID: number;
  ADC: number;
  SUPPORT: number;
}

export interface UserStatistics {
  id: string;
  summonerId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKDA: number;
  averageCSPerMinute: number;
  averageGoldPerMinute: number;
  averageDamagePerMinute: number;
  averageVisionScore: number;
  mostPlayedChampions: ChampionPlayStats[];
  roleDistribution: RoleDistribution;
  improvementTrend: number;
  lastUpdated: Date;
}

// ─── User Preference ──────────────────────────────────────────────────────────

export interface UserPreference {
  id: string;
  summonerId: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  overlayEnabled: boolean;
  overlayPosition: OverlayPosition;
  recommendationLevel: RecommendationLevel;
  autoImportRunes: boolean;
  region: string;
  createdAt: Date;
  updatedAt: Date;
}
