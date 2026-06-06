-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "puuid" TEXT;

-- CreateIndex
CREATE INDEX "Participant_puuid_idx" ON "Participant"("puuid");
