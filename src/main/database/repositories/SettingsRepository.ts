import { DatabaseClient } from '../DatabaseClient';

// App-level settings don't belong to a real summoner.
// We upsert a placeholder summoner so the FK is always satisfied.
const LOCAL_SUMMONER_ID = 'local_user';

async function ensureLocalSummoner() {
  const prisma = await DatabaseClient.getInstance();
  const exists = await prisma.summoner.findUnique({ where: { id: LOCAL_SUMMONER_ID } });
  if (!exists) {
    await prisma.summoner.create({
      data: {
        id: LOCAL_SUMMONER_ID,
        puuid: 'local_user_puuid',
        accountId: 'local_user_account',
        summonerId: 'local_user_summoner',
        name: 'Local',
        tagLine: 'APP',
        profileIconId: 0,
        level: 0,
        region: 'LA2',
        lastUpdated: new Date(),
      },
    });
  }
}

export class SettingsRepository {
  static async getSettings() {
    await ensureLocalSummoner();
    const prisma = await DatabaseClient.getInstance();

    let settings = await prisma.userPreference.findUnique({
      where: { summonerId: LOCAL_SUMMONER_ID },
    });

    if (!settings) {
      settings = await prisma.userPreference.create({
        data: { summonerId: LOCAL_SUMMONER_ID, theme: 'dark', language: 'es_AR' },
      });
    }

    return settings;
  }

  static async updateSettings(data: any) {
    await ensureLocalSummoner();
    const prisma = await DatabaseClient.getInstance();

    return prisma.userPreference.upsert({
      where: { summonerId: LOCAL_SUMMONER_ID },
      update: data,
      create: { summonerId: LOCAL_SUMMONER_ID, ...data },
    });
  }
}
