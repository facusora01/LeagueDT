-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Summoner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puuid" TEXT NOT NULL,
    "accountId" TEXT,
    "summonerId" TEXT,
    "name" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Summoner" ("accountId", "createdAt", "id", "lastUpdated", "level", "name", "profileIconId", "puuid", "region", "summonerId", "tagLine") SELECT "accountId", "createdAt", "id", "lastUpdated", "level", "name", "profileIconId", "puuid", "region", "summonerId", "tagLine" FROM "Summoner";
DROP TABLE "Summoner";
ALTER TABLE "new_Summoner" RENAME TO "Summoner";
CREATE UNIQUE INDEX "Summoner_puuid_key" ON "Summoner"("puuid");
CREATE UNIQUE INDEX "Summoner_accountId_key" ON "Summoner"("accountId");
CREATE UNIQUE INDEX "Summoner_summonerId_key" ON "Summoner"("summonerId");
CREATE INDEX "Summoner_name_region_idx" ON "Summoner"("name", "region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
