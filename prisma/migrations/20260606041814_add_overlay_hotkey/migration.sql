-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summonerId" TEXT NOT NULL,
    "apiKey" TEXT,
    "overlayHotkey" TEXT NOT NULL DEFAULT 'CommandOrControl+Shift+O',
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
INSERT INTO "new_UserPreference" ("apiKey", "autoImportRunes", "createdAt", "id", "language", "notificationsEnabled", "overlayEnabled", "overlayPosition", "recommendationLevel", "region", "soundEnabled", "summonerId", "theme", "updatedAt") SELECT "apiKey", "autoImportRunes", "createdAt", "id", "language", "notificationsEnabled", "overlayEnabled", "overlayPosition", "recommendationLevel", "region", "soundEnabled", "summonerId", "theme", "updatedAt" FROM "UserPreference";
DROP TABLE "UserPreference";
ALTER TABLE "new_UserPreference" RENAME TO "UserPreference";
CREATE UNIQUE INDEX "UserPreference_summonerId_key" ON "UserPreference"("summonerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
