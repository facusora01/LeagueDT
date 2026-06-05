-- CreateTable
CREATE TABLE "Summoner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puuid" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "summonerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Champion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "info" TEXT NOT NULL,
    "stats" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ChampionMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summonerId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "lastPlayTime" DATETIME NOT NULL,
    "chestGranted" BOOLEAN NOT NULL,
    "tokensEarned" INTEGER NOT NULL,
    CONSTRAINT "ChampionMastery_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChampionMastery_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" BIGINT NOT NULL,
    "platformId" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "mapId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "gameCreation" DATETIME NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "gameVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "firstBlood" BOOLEAN NOT NULL,
    "firstTower" BOOLEAN NOT NULL,
    "firstInhibitor" BOOLEAN NOT NULL,
    "firstBaron" BOOLEAN NOT NULL,
    "firstDragon" BOOLEAN NOT NULL,
    "firstRiftHerald" BOOLEAN NOT NULL,
    "towerKills" INTEGER NOT NULL,
    "inhibitorKills" INTEGER NOT NULL,
    "baronKills" INTEGER NOT NULL,
    "dragonKills" INTEGER NOT NULL,
    "riftHeraldKills" INTEGER NOT NULL,
    CONSTRAINT "Team_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChampionBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "pickTurn" INTEGER NOT NULL,
    CONSTRAINT "ChampionBan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "championId" INTEGER NOT NULL,
    "summonerId" TEXT,
    "summonerName" TEXT NOT NULL,
    "participantId" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "goldSpent" INTEGER NOT NULL,
    "totalDamageDealt" INTEGER NOT NULL,
    "totalDamageDealtToChampions" INTEGER NOT NULL,
    "totalDamageTaken" INTEGER NOT NULL,
    "totalHeal" INTEGER NOT NULL,
    "visionScore" INTEGER NOT NULL,
    "wardsPlaced" INTEGER NOT NULL,
    "wardsKilled" INTEGER NOT NULL,
    "creepScore" INTEGER NOT NULL,
    "neutralMinionsKilled" INTEGER NOT NULL,
    "teamObjectiveKills" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "items" TEXT NOT NULL,
    "perk0" INTEGER NOT NULL DEFAULT 0,
    "perk1" INTEGER NOT NULL DEFAULT 0,
    "perk2" INTEGER NOT NULL DEFAULT 0,
    "perk3" INTEGER NOT NULL DEFAULT 0,
    "perk4" INTEGER NOT NULL DEFAULT 0,
    "perk5" INTEGER NOT NULL DEFAULT 0,
    "perkPrimaryStyle" INTEGER NOT NULL DEFAULT 0,
    "perkSubStyle" INTEGER NOT NULL DEFAULT 0,
    "statPerks" TEXT NOT NULL DEFAULT '{}',
    "role" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    CONSTRAINT "Participant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participant_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Participant_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "plaintext" TEXT NOT NULL,
    "into" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "gold" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "stats" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Rune" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL,
    "longDesc" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" BIGINT NOT NULL,
    "mapId" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "gameQueueConfigId" INTEGER NOT NULL,
    "gameStartTime" DATETIME NOT NULL,
    "gameLength" INTEGER NOT NULL,
    "platformId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LiveChampionBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveMatchId" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "pickTurn" INTEGER NOT NULL,
    CONSTRAINT "LiveChampionBan_liveMatchId_fkey" FOREIGN KEY ("liveMatchId") REFERENCES "LiveMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveMatchId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "championId" INTEGER NOT NULL,
    "summonerId" TEXT NOT NULL,
    "summonerName" TEXT NOT NULL,
    "spell1Id" INTEGER NOT NULL,
    "spell2Id" INTEGER NOT NULL,
    "perk0" INTEGER NOT NULL DEFAULT 0,
    "perk1" INTEGER NOT NULL DEFAULT 0,
    "perk2" INTEGER NOT NULL DEFAULT 0,
    "perk3" INTEGER NOT NULL DEFAULT 0,
    "perk4" INTEGER NOT NULL DEFAULT 0,
    "perk5" INTEGER NOT NULL DEFAULT 0,
    "perkPrimaryStyle" INTEGER NOT NULL DEFAULT 0,
    "perkSubStyle" INTEGER NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "items" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "LiveParticipant_liveMatchId_fkey" FOREIGN KEY ("liveMatchId") REFERENCES "LiveMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LiveParticipant_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summonerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "confidence" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "actedUpon" BOOLEAN NOT NULL DEFAULT false,
    "matchId" TEXT,
    CONSTRAINT "Recommendation_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserStatistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summonerId" TEXT NOT NULL,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0,
    "averageKDA" REAL NOT NULL DEFAULT 0,
    "averageCSPerMinute" REAL NOT NULL DEFAULT 0,
    "averageGoldPerMinute" REAL NOT NULL DEFAULT 0,
    "averageDamagePerMinute" REAL NOT NULL DEFAULT 0,
    "averageVisionScore" REAL NOT NULL DEFAULT 0,
    "mostPlayedChampions" TEXT NOT NULL DEFAULT '[]',
    "roleDistribution" TEXT NOT NULL DEFAULT '{}',
    "improvementTrend" REAL NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "UserStatistics_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summonerId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "language" TEXT NOT NULL DEFAULT 'es_AR',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overlayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overlayPosition" TEXT NOT NULL DEFAULT 'TOP_RIGHT',
    "recommendationLevel" TEXT NOT NULL DEFAULT 'DETAILED',
    "autoImportRunes" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT NOT NULL DEFAULT 'LA2',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_summonerId_fkey" FOREIGN KEY ("summonerId") REFERENCES "Summoner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Summoner_puuid_key" ON "Summoner"("puuid");

-- CreateIndex
CREATE UNIQUE INDEX "Summoner_accountId_key" ON "Summoner"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Summoner_summonerId_key" ON "Summoner"("summonerId");

-- CreateIndex
CREATE INDEX "Summoner_name_region_idx" ON "Summoner"("name", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Champion_key_key" ON "Champion"("key");

-- CreateIndex
CREATE INDEX "ChampionMastery_summonerId_idx" ON "ChampionMastery"("summonerId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionMastery_summonerId_championId_key" ON "ChampionMastery"("summonerId", "championId");

-- CreateIndex
CREATE INDEX "Match_gameCreation_gameMode_idx" ON "Match"("gameCreation", "gameMode");

-- CreateIndex
CREATE INDEX "Team_matchId_teamId_idx" ON "Team"("matchId", "teamId");

-- CreateIndex
CREATE INDEX "Participant_summonerId_championId_idx" ON "Participant"("summonerId", "championId");

-- CreateIndex
CREATE INDEX "Participant_matchId_teamId_idx" ON "Participant"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Rune_key_key" ON "Rune"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMatch_gameId_key" ON "LiveMatch"("gameId");

-- CreateIndex
CREATE INDEX "LiveMatch_gameId_idx" ON "LiveMatch"("gameId");

-- CreateIndex
CREATE INDEX "Recommendation_summonerId_timestamp_idx" ON "Recommendation"("summonerId", "timestamp");

-- CreateIndex
CREATE INDEX "Recommendation_summonerId_type_idx" ON "Recommendation"("summonerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserStatistics_summonerId_key" ON "UserStatistics"("summonerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_summonerId_key" ON "UserPreference"("summonerId");
