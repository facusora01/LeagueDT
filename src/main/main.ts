import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { LcuConnector } from './api/lcu/LcuConnector';
import { DataDragonManager } from './api/datadragon/DataDragonManager';
import { RiotApiClient, RiotRegion } from './api/riot/RiotApiClient';
import { SettingsRepository } from './database/repositories/SettingsRepository';
import { SummonerRepository } from './database/repositories/SummonerRepository';
import { ChampionRepository } from './database/repositories/ChampionRepository';
import { ChampionMasteryRepository } from './database/repositories/ChampionMasteryRepository';
import { MatchRepository } from './database/repositories/MatchRepository';

let mainWindow: BrowserWindow | null = null;
const lcuConnector = new LcuConnector();
const riotClient = new RiotApiClient();
let dataDragon: DataDragonManager | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev =
    process.argv.includes('--watch') ||
    process.env.NODE_ENV === 'development' ||
    !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerIpcHandlers() {
  // ── Core ──────────────────────────────────────────────────────────────────
  ipcMain.handle('ping', () => 'Pong desde el proceso Main (Electron)!');
  ipcMain.handle('get-lcu-status', () =>
    lcuConnector.isConnected ? 'connected' : 'disconnected',
  );

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:get-settings', () => SettingsRepository.getSettings());
  ipcMain.handle('db:update-settings', (_e, settings) =>
    SettingsRepository.updateSettings(settings),
  );

  // ── API Key ───────────────────────────────────────────────────────────────
  ipcMain.handle('riot:set-api-key', (_e, key: string) => {
    riotClient.setApiKey(key);
    return { ok: true };
  });

  // ── Summoner ──────────────────────────────────────────────────────────────
  ipcMain.handle('summoner:search', async (_e, gameName: string, tagLine: string, region: string) => {
    const riotRegion = region as RiotRegion;
    const routing = riotClient.getRoutingValue(riotRegion);

    const account = await riotClient.getAccountByRiotId(routing, gameName, tagLine);
    const summoner = await riotClient.getSummonerByPuuid(riotRegion, account.puuid);

    const saved = await SummonerRepository.upsert({
      puuid: account.puuid,
      accountId: summoner.accountId,
      summonerId: summoner.id,
      name: account.gameName,
      tagLine: account.tagLine,
      profileIconId: summoner.profileIconId,
      level: summoner.summonerLevel,
      region: riotRegion,
      lastUpdated: new Date(),
    });

    return saved;
  });

  ipcMain.handle('summoner:get-all', () => SummonerRepository.findAll());

  // ── Champion Mastery ──────────────────────────────────────────────────────
  ipcMain.handle('mastery:sync', async (_e, summonerId: string) => {
    const summoner = await SummonerRepository.findBySummonerId(summonerId);
    if (!summoner) throw new Error('Summoner not found');

    const riotRegion = summoner.region as RiotRegion;
    const masteries = await riotClient.getAllChampionMasteries(riotRegion, summoner.puuid);

    await ChampionMasteryRepository.upsertMany(
      summoner.id,
      masteries.map(m => ({
        championId: m.championId,
        level: m.championLevel,
        points: m.championPoints,
        lastPlayTime: new Date(m.lastPlayTime),
        chestGranted: m.chestGranted,
        tokensEarned: m.tokensEarned,
      })),
    );

    return { synced: masteries.length };
  });

  ipcMain.handle('mastery:get', (_e, summonerId: string) =>
    ChampionMasteryRepository.findBySummoner(summonerId),
  );

  // ── Champions ─────────────────────────────────────────────────────────────
  ipcMain.handle('champions:get-all', () => ChampionRepository.findAll());
  ipcMain.handle('champions:get-by-id', (_e, id: number) => ChampionRepository.findById(id));

  // ── Match History ─────────────────────────────────────────────────────────
  ipcMain.handle('matches:get', (_e, summonerId: string, limit?: number) =>
    MatchRepository.findBySummonerId(summonerId, limit),
  );

  ipcMain.handle('matches:sync', async (_e, summonerId: string, count = 10) => {
    const summoner = await SummonerRepository.findBySummonerId(summonerId);
    if (!summoner) throw new Error('Summoner not found');

    const riotRegion = summoner.region as RiotRegion;
    const routing = riotClient.getRoutingValue(riotRegion);

    const matchIds = await riotClient.getMatchIdsByPuuid(routing, summoner.puuid, { count });
    let saved = 0;

    for (const matchId of matchIds) {
      if (await MatchRepository.exists(matchId)) continue;

      try {
        const raw = await riotClient.getMatch(routing, matchId);
        const info = raw.info;

        await MatchRepository.create({
          id: raw.metadata.matchId,
          gameId: BigInt(info.gameId),
          platformId: info.platformId ?? riotRegion,
          queueId: info.queueId,
          mapId: info.mapId,
          seasonId: 0,
          gameCreation: new Date(info.gameCreation),
          gameDuration: info.gameDuration,
          gameMode: info.gameMode,
          gameType: info.gameType,
          gameVersion: info.gameVersion,
          teams: info.teams.map((t: any) => ({
            teamId: t.teamId,
            win: t.win,
            firstBlood: t.objectives?.champion?.first ?? false,
            firstTower: t.objectives?.tower?.first ?? false,
            firstInhibitor: t.objectives?.inhibitor?.first ?? false,
            firstBaron: t.objectives?.baron?.first ?? false,
            firstDragon: t.objectives?.dragon?.first ?? false,
            firstRiftHerald: t.objectives?.riftHerald?.first ?? false,
            towerKills: t.objectives?.tower?.kills ?? 0,
            inhibitorKills: t.objectives?.inhibitor?.kills ?? 0,
            baronKills: t.objectives?.baron?.kills ?? 0,
            dragonKills: t.objectives?.dragon?.kills ?? 0,
            riftHeraldKills: t.objectives?.riftHerald?.kills ?? 0,
            bans: t.bans ?? [],
          })),
          participants: info.participants.map((p: any) => ({
            teamId: p.teamId,
            championId: p.championId,
            summonerId: p.summonerId || undefined,
            summonerName: p.summonerName ?? p.riotIdGameName ?? '',
            participantId: p.participantId,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            goldEarned: p.goldEarned,
            goldSpent: p.goldSpent,
            totalDamageDealt: p.totalDamageDealt,
            totalDamageDealtToChampions: p.totalDamageDealtToChampions,
            totalDamageTaken: p.totalDamageTaken,
            totalHeal: p.totalHeal,
            visionScore: p.visionScore,
            wardsPlaced: p.wardsPlaced,
            wardsKilled: p.wardsKilled,
            creepScore: p.totalMinionsKilled ?? 0,
            neutralMinionsKilled: p.neutralMinionsKilled ?? 0,
            teamObjectiveKills: 0,
            win: p.win,
            items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(Boolean),
            perk0: p.perks?.styles?.[0]?.selections?.[0]?.perk ?? 0,
            perk1: p.perks?.styles?.[0]?.selections?.[1]?.perk ?? 0,
            perk2: p.perks?.styles?.[0]?.selections?.[2]?.perk ?? 0,
            perk3: p.perks?.styles?.[0]?.selections?.[3]?.perk ?? 0,
            perk4: p.perks?.styles?.[1]?.selections?.[0]?.perk ?? 0,
            perk5: p.perks?.styles?.[1]?.selections?.[1]?.perk ?? 0,
            perkPrimaryStyle: p.perks?.styles?.[0]?.style ?? 0,
            perkSubStyle: p.perks?.styles?.[1]?.style ?? 0,
            statPerks: {
              defense: p.perks?.statPerks?.defense ?? 0,
              flex: p.perks?.statPerks?.flex ?? 0,
              offense: p.perks?.statPerks?.offense ?? 0,
            },
            role: p.teamPosition ?? p.role ?? '',
            lane: p.lane ?? '',
          })),
        });
        saved++;
      } catch (err) {
        console.error(`[Matches] Failed to save ${matchId}:`, err);
      }
    }

    return { found: matchIds.length, saved };
  });

  // ── DataDragon ────────────────────────────────────────────────────────────
  ipcMain.handle('datadragon:version', () => dataDragon?.currentVersion ?? null);
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  createWindow();

  // Initialize DataDragon in background after window opens
  dataDragon = new DataDragonManager(app.getPath('userData'));
  dataDragon.initialize().catch(err => console.error('[DataDragon] Init error:', err));

  // Apply saved API key if present
  const settings = await SettingsRepository.getSettings();
  if ((settings as any).apiKey) {
    riotClient.setApiKey((settings as any).apiKey);
  }

  lcuConnector.on('connect', () => {
    mainWindow?.webContents.send('lcu-status', 'connected');
  });

  lcuConnector.on('disconnect', () => {
    mainWindow?.webContents.send('lcu-status', 'disconnected');
  });

  lcuConnector.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  lcuConnector.stop();
  if (process.platform !== 'darwin') app.quit();
});
