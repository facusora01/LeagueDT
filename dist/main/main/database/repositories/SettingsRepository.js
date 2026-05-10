"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
const DatabaseClient_1 = require("../DatabaseClient");
// We'll use a hardcoded default summoner ID for local settings since 
// the user might not be logged in yet.
const LOCAL_USER_ID = 'local_user';
class SettingsRepository {
    static async getSettings() {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
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
    static async updateSettings(data) {
        const prisma = await DatabaseClient_1.DatabaseClient.getInstance();
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
exports.SettingsRepository = SettingsRepository;
