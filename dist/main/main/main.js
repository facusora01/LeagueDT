"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const LcuConnector_1 = require("./api/lcu/LcuConnector");
const DataDragonManager_1 = require("./api/datadragon/DataDragonManager");
const RiotApiClient_1 = require("./api/riot/RiotApiClient");
const SettingsRepository_1 = require("./database/repositories/SettingsRepository");
const SummonerRepository_1 = require("./database/repositories/SummonerRepository");
const ChampionRepository_1 = require("./database/repositories/ChampionRepository");
const ChampionMasteryRepository_1 = require("./database/repositories/ChampionMasteryRepository");
const MatchRepository_1 = require("./database/repositories/MatchRepository");
const DraftSession_1 = require("./services/draft/DraftSession");
const LcuDraftDetector_1 = require("./services/draft/LcuDraftDetector");
const LiveMatchTracker_1 = require("./services/ingame/LiveMatchTracker");
let mainWindow = null;
const lcuConnector = new LcuConnector_1.LcuConnector();
const riotClient = new RiotApiClient_1.RiotApiClient();
const draftSession = new DraftSession_1.DraftSession();
const liveTracker = new LiveMatchTracker_1.LiveMatchTracker();
let dataDragon = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    const isDev = process.argv.includes('--watch') ||
        process.env.NODE_ENV === 'development' ||
        !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
}
function registerIpcHandlers() {
    // ── Core ──────────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('ping', () => 'Pong desde el proceso Main (Electron)!');
    electron_1.ipcMain.handle('get-lcu-status', () => lcuConnector.isConnected ? 'connected' : 'disconnected');
    // ── Settings ──────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:get-settings', () => SettingsRepository_1.SettingsRepository.getSettings());
    electron_1.ipcMain.handle('db:update-settings', (_e, settings) => SettingsRepository_1.SettingsRepository.updateSettings(settings));
    // ── API Key ───────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('riot:set-api-key', (_e, key) => {
        riotClient.setApiKey(key);
        return { ok: true };
    });
    // ── Summoner ──────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('summoner:search', async (_e, gameName, tagLine, region) => {
        const riotRegion = region;
        const routing = riotClient.getRoutingValue(riotRegion);
        const account = await riotClient.getAccountByRiotId(routing, gameName, tagLine);
        const summoner = await riotClient.getSummonerByPuuid(riotRegion, account.puuid);
        const saved = await SummonerRepository_1.SummonerRepository.upsert({
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
    electron_1.ipcMain.handle('summoner:get-all', () => SummonerRepository_1.SummonerRepository.findAll());
    // ── Champion Mastery ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle('mastery:sync', async (_e, summonerId) => {
        const summoner = await SummonerRepository_1.SummonerRepository.findBySummonerId(summonerId);
        if (!summoner)
            throw new Error('Summoner not found');
        const riotRegion = summoner.region;
        const masteries = await riotClient.getAllChampionMasteries(riotRegion, summoner.puuid);
        await ChampionMasteryRepository_1.ChampionMasteryRepository.upsertMany(summoner.id, masteries.map(m => ({
            championId: m.championId,
            level: m.championLevel,
            points: m.championPoints,
            lastPlayTime: new Date(m.lastPlayTime),
            chestGranted: m.chestGranted,
            tokensEarned: m.tokensEarned,
        })));
        return { synced: masteries.length };
    });
    electron_1.ipcMain.handle('mastery:get', (_e, summonerId) => ChampionMasteryRepository_1.ChampionMasteryRepository.findBySummoner(summonerId));
    // ── Champions ─────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('champions:get-all', () => ChampionRepository_1.ChampionRepository.findAll());
    electron_1.ipcMain.handle('champions:get-by-id', (_e, id) => ChampionRepository_1.ChampionRepository.findById(id));
    // ── Match History ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('matches:get', (_e, summonerId, limit) => MatchRepository_1.MatchRepository.findBySummonerId(summonerId, limit));
    electron_1.ipcMain.handle('matches:sync', async (_e, summonerId, count = 10) => {
        const summoner = await SummonerRepository_1.SummonerRepository.findBySummonerId(summonerId);
        if (!summoner)
            throw new Error('Summoner not found');
        const riotRegion = summoner.region;
        const routing = riotClient.getRoutingValue(riotRegion);
        const matchIds = await riotClient.getMatchIdsByPuuid(routing, summoner.puuid, { count });
        let saved = 0;
        for (const matchId of matchIds) {
            if (await MatchRepository_1.MatchRepository.exists(matchId))
                continue;
            try {
                const raw = await riotClient.getMatch(routing, matchId);
                const info = raw.info;
                await MatchRepository_1.MatchRepository.create({
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
                    teams: info.teams.map((t) => ({
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
                    participants: info.participants.map((p) => ({
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
            }
            catch (err) {
                console.error(`[Matches] Failed to save ${matchId}:`, err);
            }
        }
        return { found: matchIds.length, saved };
    });
    // ── DataDragon ────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('datadragon:version', () => dataDragon?.currentVersion ?? null);
    // ── Draft ─────────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('draft:get-state', () => draftSession.getState());
    // ── In-Game Coach ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('ingame:start', () => { liveTracker.start(); return { ok: true }; });
    electron_1.ipcMain.handle('ingame:stop', () => { liveTracker.stop(); return { ok: true }; });
}
function wireIngameEvents() {
    liveTracker.on('gameStarted', s => mainWindow?.webContents.send('ingame:game-started', s));
    liveTracker.on('stateUpdated', s => mainWindow?.webContents.send('ingame:state-updated', s));
    liveTracker.on('gameEnded', () => mainWindow?.webContents.send('ingame:game-ended'));
    liveTracker.on('threatsUpdated', t => mainWindow?.webContents.send('ingame:threats', t));
    liveTracker.on('itemsUpdated', r => mainWindow?.webContents.send('ingame:items', r));
    liveTracker.on('tipsUpdated', t => mainWindow?.webContents.send('ingame:tips', t));
    liveTracker.on('newEvents', e => mainWindow?.webContents.send('ingame:events', e));
}
function wireDraftEvents() {
    draftSession.on('stateChanged', state => {
        mainWindow?.webContents.send('draft:state-changed', state);
    });
    draftSession.on('recommendations', recs => {
        mainWindow?.webContents.send('draft:recommendations', recs);
    });
    draftSession.on('banSuggestions', bans => {
        mainWindow?.webContents.send('draft:ban-suggestions', bans);
    });
}
electron_1.app.whenReady().then(async () => {
    registerIpcHandlers();
    wireIngameEvents();
    wireDraftEvents();
    createWindow();
    // Initialize DataDragon in background; after done, seed draft session with static data
    dataDragon = new DataDragonManager_1.DataDragonManager(electron_1.app.getPath('userData'));
    dataDragon.initialize().then(async () => {
        const champions = await ChampionRepository_1.ChampionRepository.findAll();
        draftSession.setStaticData(champions.map(c => ({ id: c.id, name: c.name, tags: c.tags })), []);
        console.log(`[Draft] Loaded ${champions.length} champions into draft session`);
    }).catch(err => console.error('[DataDragon] Init error:', err));
    // Apply saved API key if present
    const settings = await SettingsRepository_1.SettingsRepository.getSettings();
    if (settings.apiKey) {
        riotClient.setApiKey(settings.apiKey);
    }
    // Start draft detector (wires LCU events → draftSession)
    new LcuDraftDetector_1.LcuDraftDetector(lcuConnector, draftSession);
    // Auto-start in-game tracker when draft finishes (game is loading)
    draftSession.on('stateChanged', (s) => {
        if (s.phase === 'finished') {
            liveTracker.start();
        }
    });
    lcuConnector.on('connect', () => {
        mainWindow?.webContents.send('lcu-status', 'connected');
    });
    lcuConnector.on('disconnect', () => {
        mainWindow?.webContents.send('lcu-status', 'disconnected');
    });
    lcuConnector.start();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    lcuConnector.stop();
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
