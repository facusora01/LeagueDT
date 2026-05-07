# Data Models

## Database Schema Overview
**Database Type**: SQLite (local only)
**ORM**: Prisma or TypeORM

All data is stored locally on the user's machine. No cloud database or server components.

## Core Entities

### Summoner
Represents a League of Legends player account.

```typescript
interface Summoner {
  id: string;                    // Primary key
  puuid: string;                 // Riot PUUID
  accountId: string;             // Riot Account ID
  summonerId: string;            // Riot Summoner ID
  name: string;                  // Summoner name
  tagLine: string;               // Riot ID tagline
  profileIconId: number;         // Profile icon ID
  level: number;                 // Summoner level
  region: string;                // Server region (NA, EUW, KR, etc.)
  lastUpdated: Date;             // Last API sync
  createdAt: Date;               // Record creation date
}
```

### Champion
Static champion data from Data Dragon.

```typescript
interface Champion {
  id: number;                    // Champion ID
  key: string;                   // Champion key (e.g., "Aatrox")
  name: string;                  // Champion name
  title: string;                 // Champion title
  blurb: string;                 // Champion description
  info: ChampionInfo;           // Role info
  tags: string[];                // Champion tags (Tank, Mage, etc.)
  version: string;               // Data Dragon version
  stats: ChampionStats;         // Base stats
}

interface ChampionInfo {
  attack: number;                // Attack rating (1-10)
  defense: number;               // Defense rating (1-10)
  magic: number;                 // Magic rating (1-10)
  difficulty: number;           // Difficulty rating (1-10)
}

interface ChampionStats {
  hp: number;
  hpPerLevel: number;
  mp: number;
  mpPerLevel: number;
  moveSpeed: number;
  armor: number;
  armorPerLevel: number;
  attackDamage: number;
  attackDamagePerLevel: number;
  // ... additional stats
}
```

### ChampionMastery
User's mastery level for each champion.

```typescript
interface ChampionMastery {
  id: string;                    // Primary key
  summonerId: string;            // Foreign key to Summoner
  championId: number;            // Champion ID
  level: number;                 // Mastery level (1-7)
  points: number;                // Mastery points
  lastPlayTime: Date;            // Last played timestamp
  chestGranted: boolean;         // Chest earned status
  tokensEarned: number;          // Tokens earned
  summoner: Summoner;            // Relation
  champion: Champion;            // Relation
}
```

### Match
Represents a completed match.

```typescript
interface Match {
  id: string;                    // Match ID
  gameId: number;                // Game ID
  platformId: string;            // Platform identifier
  queueId: number;               // Queue type (Ranked Solo, etc.)
  mapId: number;                 // Map ID
  seasonId: number;              // Season ID
  gameCreation: Date;            // Game creation timestamp
  gameDuration: number;          // Game duration in seconds
  gameMode: string;              // Game mode
  gameType: string;              // Game type
  gameVersion: string;           // Game version
  teams: Team[];                 // Teams in match
  participants: Participant[];   // Participants
  timeline: Timeline;           // Match timeline data
  createdAt: Date;               // Record creation date
}
```

### Team
Represents a team in a match.

```typescript
interface Team {
  id: string;                    // Primary key
  matchId: string;               // Foreign key to Match
  teamId: number;                // Team ID (100 or 200)
  win: boolean;                  // Win/loss status
  firstBlood: boolean;           // First blood achieved
  firstTower: boolean;           // First tower destroyed
  firstInhibitor: boolean;       // First inhibitor destroyed
  firstBaron: boolean;           // First baron killed
  firstDragon: boolean;          // First dragon killed
  firstRiftHerald: boolean;      // First rift herald killed
  towerKills: number;            // Towers destroyed
  inhibitorKills: number;        // Inhibitors destroyed
  baronKills: number;            // Barons killed
  dragonKills: number;          // Dragons killed
  riftHeraldKills: number;      // Rift heralds killed
  bans: ChampionBan[];          // Champion bans
  participants: Participant[];   // Team participants
  match: Match;                  // Relation
}
```

### Participant
Represents a player in a match.

```typescript
interface Participant {
  id: string;                    // Primary key
  matchId: string;               // Foreign key to Match
  teamId: number;                // Team ID
  championId: number;            // Champion played
  summonerId: string;            // Summoner ID (nullable for custom games)
  summonerName: string;          // Summoner name
  participantId: number;         // Participant ID
  kills: number;                 // Kills
  deaths: number;                // Deaths
  assists: number;               // Assists
  goldEarned: number;            // Gold earned
  goldSpent: number;             // Gold spent
  totalDamageDealt: number;      // Total damage dealt
  totalDamageDealtToChampions: number; // Damage to champions
  totalDamageTaken: number;      // Damage taken
  totalHeal: number;             // Total healing
  visionScore: number;           // Vision score
  wardsPlaced: number;           // Wards placed
  wardsKilled: number;           // Wards killed
  creepScore: number;            // Creep score
  neutralMinionsKilled: number;  // Neutral minions killed
  teamObjectiveKills: number;    // Team objective kills
  win: boolean;                  // Win/loss
  items: number[];               // Item IDs
  perk0: number;                 // Primary keystone
  perk1: number;                 // Secondary rune
  perk2: number;                 // Tertiary rune
  perk3: number;                 // Quaternary rune
  perk4: number;                 // Quinary rune
  perk5: number;                 // Senary rune
  perkPrimaryStyle: number;      // Primary rune tree
  perkSubStyle: number;          // Secondary rune tree
  statPerks: StatPerks;         // Stat perks
  role: string;                  // Role (TOP, JUNGLE, MID, ADC, SUPPORT)
  lane: string;                  // Lane
  match: Match;                   // Relation
  summoner: Summoner;            // Relation
  champion: Champion;            // Relation
}
```

### Item
Static item data from Data Dragon.

```typescript
interface Item {
  id: number;                    // Item ID
  name: string;                  // Item name
  description: string;           // Item description
  colloq: string;                // Colloquial name
  plaintext: string;             // Plain text description
  into: number[];                // Items this builds into
  from: number[];                // Components
  gold: ItemGold;               // Gold information
  tags: string[];                // Item tags
  stats: ItemStats;             // Item stats
  version: string;               // Data Dragon version
}

interface ItemGold {
  base: number;                  // Base gold cost
  total: number;                 // Total gold cost
  sell: number;                  // Sell price
  purchaseable: boolean;         // Can be purchased
}

interface ItemStats {
  [key: string]: number;         // Dynamic stat bonuses
}
```

### Rune
Static rune data from Data Dragon.

```typescript
interface Rune {
  id: number;                    // Rune ID
  key: string;                   // Rune key
  name: string;                  // Rune name
  icon: string;                  // Icon path
  shortDesc: string;             // Short description
  longDesc: string;              // Long description
  tier: number;                   // Rune tier
  type: string;                  // Rune type
  slots: RuneSlot[];            // Rune slots (for trees)
  version: string;               // Data Dragon version
}

interface RuneSlot {
  type: string;                  // Slot type
  runes: Rune[];                // Runes in slot
}
```

### LiveMatch
Represents currently active match data.

```typescript
interface LiveMatch {
  id: string;                    // Primary key
  gameId: number;                // Game ID
  mapId: number;                 // Map ID
  gameMode: string;              // Game mode
  gameType: string;              // Game type
  gameQueueConfigId: number;     // Queue config ID
  participants: LiveParticipant[]; // Live participants
  bannedChampions: ChampionBan[]; // Banned champions
  gameStartTime: Date;           // Game start time
  gameLength: number;            // Current game length (seconds)
  platformId: string;            // Platform identifier
  observer: Observer;           // Observer info
  createdAt: Date;               // Record creation date
  updatedAt: Date;               // Last update
}
```

### LiveParticipant
Real-time participant data.

```typescript
interface LiveParticipant {
  id: string;                    // Primary key
  liveMatchId: string;           // Foreign key to LiveMatch
  teamId: number;                // Team ID
  championId: number;            // Champion ID
  summonerId: string;            // Summoner ID
  summonerName: string;          // Summoner name
  spell1Id: number;              // Summoner spell 1
  spell2Id: number;              // Summoner spell 2
  perk0: number;                 // Primary keystone
  perk1: number;                 // Secondary rune
  perk2: number;                 // Tertiary rune
  perk3: number;                 // Quaternary rune
  perk4: number;                 // Quinary rune
  perk5: number;                 // Senary rune
  perkPrimaryStyle: number;      // Primary rune tree
  perkSubStyle: number;          // Secondary rune tree
  gameCustomizationObjects: any[]; // Customization objects
  isBot: boolean;                // Is bot
  isDead: boolean;               // Is dead
  kills: number;                 // Current kills
  deaths: number;                // Current deaths
  assists: number;               // Current assists
  goldEarned: number;            // Current gold
  level: number;                 // Current level
  items: number[];               // Current items
  liveMatch: LiveMatch;          // Relation
  summoner: Summoner;            // Relation
  champion: Champion;            // Relation
}
```

### Recommendation
Stores generated recommendations.

```typescript
interface Recommendation {
  id: string;                    // Primary key
  type: RecommendationType;      // Type of recommendation
  context: RecommendationContext; // Context (champion select, in-game, etc.)
  priority: number;              // Priority (1-10)
  title: string;                 // Recommendation title
  description: string;           // Detailed description
  reasoning: string;             // Why this recommendation
  data: any;                     // Associated data (champion ID, item IDs, etc.)
  confidence: number;            // Confidence score (0-1)
  timestamp: Date;               // When generated
  dismissed: boolean;            // User dismissed
  actedUpon: boolean;            // User acted on recommendation
  matchId?: string;              // Associated match (if applicable)
  summonerId: string;            // User who received recommendation
}

enum RecommendationType {
  CHAMPION_PICK = "CHAMPION_PICK",
  CHAMPION_BAN = "CHAMPION_BAN",
  ITEM_PURCHASE = "ITEM_PURCHASE",
  STRATEGIC_TIP = "STRATEGIC_TIP",
  OBJECTIVE_TIMING = "OBJECTIVE_TIMING",
  POSITIONING = "POSITIONING",
  VISION = "VISION"
}

enum RecommendationContext {
  CHAMPION_SELECT = "CHAMPION_SELECT",
  EARLY_GAME = "EARLY_GAME",
  MID_GAME = "MID_GAME",
  LATE_GAME = "LATE_GAME",
  TEAMFIGHT = "TEAMFIGHT",
  SPLIT_PUSH = "SPLIT_PUSH"
}
```

### UserPreference
User settings and preferences.

```typescript
interface UserPreference {
  id: string;                    // Primary key
  summonerId: string;            // User's summoner ID
  theme: string;                 // UI theme (dark, light)
  language: string;              // Language preference
  notificationsEnabled: boolean; // Enable notifications
  soundEnabled: boolean;         // Enable sounds
  overlayEnabled: boolean;       // Enable in-game overlay
  overlayPosition: OverlayPosition; // Overlay position
  recommendationLevel: RecommendationLevel; // Recommendation detail level
  autoImportRunes: boolean;      // Auto-import rune pages
  region: string;                // Preferred region
  createdAt: Date;               // Record creation
  updatedAt: Date;               // Last update
}

enum OverlayPosition {
  TOP_LEFT = "TOP_LEFT",
  TOP_RIGHT = "TOP_RIGHT",
  BOTTOM_LEFT = "BOTTOM_LEFT",
  BOTTOM_RIGHT = "BOTTOM_RIGHT"
}

enum RecommendationLevel {
  BASIC = "BASIC",
  DETAILED = "DETAILED",
  ADVANCED = "ADVANCED"
}
```

### UserStatistics
Aggregated user statistics.

```typescript
interface UserStatistics {
  id: string;                    // Primary key
  summonerId: string;            // User's summoner ID
  totalMatches: number;          // Total matches tracked
  wins: number;                  // Total wins
  losses: number;                // Total losses
  winRate: number;               // Win rate percentage
  averageKDA: number;            // Average KDA
  averageCSPerMinute: number;    // Average CS per minute
  averageGoldPerMinute: number;  // Average gold per minute
  averageDamagePerMinute: number; // Average damage per minute
  averageVisionScore: number;    // Average vision score
  mostPlayedChampions: ChampionStats[]; // Most played champions
  roleDistribution: RoleDistribution; // Role play distribution
  improvementTrend: number;      // Improvement trend score
  lastUpdated: Date;             // Last calculation
}

interface ChampionStats {
  championId: number;
  name: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  averageKDA: number;
}

interface RoleDistribution {
  TOP: number;
  JUNGLE: number;
  MID: number;
  ADC: number;
  SUPPORT: number;
}
```

## Relationships

### Entity Relationship Diagram
```
Summoner (1) ----< (N) ChampionMastery >---- (1) Champion
Summoner (1) ----< (N) MatchParticipant >---- (N) Match
Match (1) ----< (2) Team >---- (N) Participant
Participant (N) ----> (1) Champion
Participant (N) ----> (1) Summoner
Summoner (1) ----< (N) Recommendation
Summoner (1) ---- (1) UserPreference
Summoner (1) ---- (1) UserStatistics
LiveMatch (1) ----< (N) LiveParticipant
```

## Indexing Strategy

### Primary Indexes
- All primary keys (id fields)
- Foreign keys for join performance

### Secondary Indexes
- Summoner: name, region
- Match: gameCreation, gameMode
- Participant: summonerId, championId
- ChampionMastery: summonerId, championId
- Recommendation: summonerId, timestamp, type
- LiveMatch: gameId, createdAt

### Composite Indexes
- (summonerId, championId) for ChampionMastery
- (matchId, teamId) for Participant
- (summonerId, timestamp) for Recommendation
- (gameCreation, gameMode) for Match

## Data Migration Strategy

### Version Control
- Use database migrations
- Version schema changes
- Backward compatibility where possible
- Data transformation scripts

### Backup Strategy
- Regular automatic backups to local file system
- Export to JSON for portability
- User-controlled backup and restore
- Restore procedures

## Data Retention Policy

### Match Data
- Keep detailed match data: 90 days
- Keep aggregated statistics: Indefinite
- Keep live match data: Until match ends

### Recommendations
- Keep recommendations: 30 days
- Keep recommendation analytics: 90 days
- Anonymize after retention period

### User Data
- Keep preferences: Indefinite (until deletion)
- Keep statistics: Indefinite (until deletion)
- Export on demand
- Delete on request
