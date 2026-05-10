import { DatabaseClient } from '../DatabaseClient';

// We'll use a hardcoded default summoner ID for local settings since 
// the user might not be logged in yet.
const LOCAL_USER_ID = 'local_user';

export class SettingsRepository {
  public static async getSettings() {
    const prisma = await DatabaseClient.getInstance();
    
    let settings = await prisma.userPreference.findUnique({
      where: { summonerId: LOCAL_USER_ID }
    });

    // Create default if not exists
    if (!settings) {
      settings = await prisma.userPreference.create({
        data: {
          summonerId: LOCAL_USER_ID,
          theme: 'dark',
          language: 'es_AR'
        }
      });
    }

    return settings;
  }

  public static async updateSettings(data: any) {
    const prisma = await DatabaseClient.getInstance();
    
    const settings = await prisma.userPreference.upsert({
      where: { summonerId: LOCAL_USER_ID },
      update: data,
      create: {
        summonerId: LOCAL_USER_ID,
        ...data
      }
    });

    return settings;
  }
}
