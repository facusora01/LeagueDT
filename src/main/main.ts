import { app, BrowserWindow, ipcMain, screen, Rectangle } from 'electron';
import * as path from 'path';
import { HotkeyManager } from './services/overlay/HotkeyManager';
import { LcuConnector } from './api/lcu/LcuConnector';
import { DataDragonManager } from './api/datadragon/DataDragonManager';
import { RiotApiClient, RiotRegion } from './api/riot/RiotApiClient';
import { SettingsRepository } from './database/repositories/SettingsRepository';
import { SummonerRepository } from './database/repositories/SummonerRepository';
import { ChampionRepository } from './database/repositories/ChampionRepository';
import { ChampionMasteryRepository } from './database/repositories/ChampionMasteryRepository';
import { MatchRepository } from './database/repositories/MatchRepository';
import { DraftSession } from './services/draft/DraftSession';
import { LcuDraftDetector } from './services/draft/LcuDraftDetector';
import { LiveMatchTracker } from './services/ingame/LiveMatchTracker';
import { mockChampSelectSession, mockBanPhaseSession, mockLiveGameData } from './services/dev/mockData';

type OverlayMode = 'off' | 'live' | 'edit';

let mainWindow: BrowserWindow | null = null;
let overlayMode: OverlayMode = 'off';
let normalBounds: Rectangle | null = null;
const DEFAULT_HOTKEY = 'CommandOrControl+Shift+O';
let overlayHotkey = DEFAULT_HOTKEY;
const hotkeyManager = new HotkeyManager(() => {
  // The hotkey only toggles the live overlay; it never disturbs edit mode.
  if (overlayMode === 'edit') return;
  setOverlayMode(overlayMode === 'live' ? 'off' : 'live');
});
const lcuConnector = new LcuConnector();
const riotClient = new RiotApiClient();
const draftSession = new DraftSession();
const liveTracker = new LiveMatchTracker();
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

  // Open DevTools on demand with F12 (the frameless window has no menu).
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools no longer auto-opens — use F12 when needed.
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
  ipcMain.handle('riot:set-api-key', async (_e, key: string) => {
    riotClient.setApiKey(key);
    const validity = await riotClient.validateKey();
    // Only persist a key that isn't outright rejected.
    if (validity !== 'invalid') {
      await SettingsRepository.updateSettings({ apiKey: key });
    }
    return { ok: true, validity };
  });

  // ── Summoner ──────────────────────────────────────────────────────────────
  ipcMain.handle('summoner:search', async (_e, gameName: string, tagLine: string, region: string) => {
    // UI sends region as an uppercase label (e.g. 'LA2'); enum values are lowercase.
    const riotRegion = region.toLowerCase() as RiotRegion;
    const routing = riotClient.getRoutingValue(riotRegion);

    const account = await riotClient.getAccountByRiotId(routing, gameName, tagLine);
    const summoner = await riotClient.getSummonerByPuuid(riotRegion, account.puuid);

    const saved = await SummonerRepository.upsert({
      puuid: account.puuid,
      accountId: summoner.accountId ?? null,
      summonerId: summoner.id ?? null,
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
  // Identifier is the internal Summoner.id (PK), since Riot's encrypted
  // summonerId is no longer returned by the API.
  ipcMain.handle('mastery:sync', async (_e, id: string) => {
    const summoner = await SummonerRepository.findById(id);
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
        chestGranted: m.chestGranted ?? false,
        tokensEarned: m.tokensEarned ?? 0,
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

  ipcMain.handle('matches:sync', async (_e, id: string, count = 10) => {
    const summoner = await SummonerRepository.findById(id);
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

  // ── Draft ─────────────────────────────────────────────────────────────────
  ipcMain.handle('draft:get-state', () => draftSession.getState());

  // ── In-Game Coach ─────────────────────────────────────────────────────────
  ipcMain.handle('ingame:start', () => { liveTracker.start(); return { ok: true }; });
  ipcMain.handle('ingame:stop',  () => { liveTracker.stop();  return { ok: true }; });

  // ── Dev simulation (test draft / in-game without a real game) ─────────────
  ipcMain.handle('dev:simulate-draft', async (_e, phase: 'pick' | 'ban') => {
    const champs = await ChampionRepository.findAll();
    const ids = champs.slice(0, 8).map(c => c.id);
    const session = phase === 'ban'
      ? mockBanPhaseSession(ids)
      : mockChampSelectSession(ids);
    draftSession.simulate(session);
    return { ok: true };
  });

  ipcMain.handle('dev:simulate-game', () => {
    liveTracker.simulate(mockLiveGameData(), ['Mage']);
    return { ok: true };
  });

  ipcMain.handle('dev:stop-sim', () => {
    liveTracker.stop();
    draftSession.reset(true);
    return { ok: true };
  });

  // ── Overlay ───────────────────────────────────────────────────────────────
  ipcMain.handle('overlay:toggle', () => {
    if (overlayMode !== 'edit') setOverlayMode(overlayMode === 'live' ? 'off' : 'live');
    return { mode: overlayMode };
  });
  ipcMain.handle('overlay:set-mode', (_e, mode: OverlayMode) => {
    setOverlayMode(mode);
    return { mode: overlayMode };
  });
  ipcMain.handle('overlay:get', () => ({ mode: overlayMode }));
  ipcMain.handle('overlay:get-hotkey', () => ({ hotkey: overlayHotkey }));
  ipcMain.handle('overlay:set-hotkey', async (_e, accel: string) => {
    const ok = registerOverlayShortcut(accel);
    if (ok) await SettingsRepository.updateSettings({ overlayHotkey: accel });
    return { ok, hotkey: overlayHotkey };
  });
}

function wireIngameEvents() {
  liveTracker.on('gameStarted',  s   => mainWindow?.webContents.send('ingame:game-started', s));
  liveTracker.on('stateUpdated', s   => mainWindow?.webContents.send('ingame:state-updated', s));
  liveTracker.on('gameEnded',    ()  => mainWindow?.webContents.send('ingame:game-ended'));
  liveTracker.on('threatsUpdated', t => mainWindow?.webContents.send('ingame:threats', t));
  liveTracker.on('itemsUpdated', r   => mainWindow?.webContents.send('ingame:items', r));
  liveTracker.on('tipsUpdated',  t   => mainWindow?.webContents.send('ingame:tips', t));
  liveTracker.on('newEvents',    e   => mainWindow?.webContents.send('ingame:events', e));
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

// Reads the logged-in account straight from the League client (no API key
// needed) and persists it, then syncs mastery if a Riot key is available.
//
// Note: the LCU returns an obfuscated puuid (UUID form) that the public API
// rejects. When a key is present we resolve the real encrypted puuid via the
// Account API using the client-provided gameName/tagLine.
async function loadCurrentSummonerFromLcu() {
  const current = await lcuConnector.request<any>('/lol-summoner/v1/current-summoner');
  const displayName = current?.gameName || current?.displayName;
  if (!current || !displayName) return;

  const regionInfo = await lcuConnector.request<any>('/riotclient/region-locale');
  const region = (regionInfo?.region ?? 'LA2').toLowerCase();

  const settings = await SettingsRepository.getSettings();
  const hasKey = !!(settings as any).apiKey;

  // Best-effort: resolve the real puuid so public-API calls work.
  let puuid: string = current.puuid;
  let realPuuid = false;
  if (hasKey && current.gameName && current.tagLine) {
    try {
      const routing = riotClient.getRoutingValue(region as RiotRegion);
      const account = await riotClient.getAccountByRiotId(routing, current.gameName, current.tagLine);
      puuid = account.puuid;
      realPuuid = true;
    } catch (err) {
      console.error('[LCU] Could not resolve real puuid via Account API:', err);
    }
  }

  const saved = await SummonerRepository.upsert({
    puuid,
    accountId: current.accountId ? String(current.accountId) : null,
    summonerId: current.summonerId ? String(current.summonerId) : null,
    name: displayName,
    tagLine: current.tagLine ?? '',
    profileIconId: current.profileIconId ?? 0,
    level: current.summonerLevel ?? 0,
    region,
    lastUpdated: new Date(),
  });

  mainWindow?.webContents.send('summoner:current', saved);

  // Mastery requires the real puuid + a valid key.
  if (realPuuid) {
    try {
      const masteries = await riotClient.getAllChampionMasteries(region as RiotRegion, puuid);
      await ChampionMasteryRepository.upsertMany(
        saved.id,
        masteries.map(m => ({
          championId: m.championId,
          level: m.championLevel,
          points: m.championPoints,
          lastPlayTime: new Date(m.lastPlayTime),
          chestGranted: m.chestGranted ?? false,
          tokensEarned: m.tokensEarned ?? 0,
        })),
      );
      mainWindow?.webContents.send('summoner:mastery-synced', saved.id);
    } catch (err) {
      console.error('[LCU] Mastery sync failed:', err);
    }
  }
}

// Switches the window between normal, a click-through live overlay, and an
// interactive edit overlay (same full-screen frame, but mouse-enabled so the
// user can drag/resize panels).
function setOverlayMode(mode: OverlayMode) {
  if (!mainWindow || mode === overlayMode) return;
  const wasOff = overlayMode === 'off';
  overlayMode = mode;

  if (mode === 'off') {
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    if (normalBounds) mainWindow.setBounds(normalBounds);
  } else {
    if (wasOff) {
      normalBounds = mainWindow.getBounds();
      mainWindow.setBounds(screen.getPrimaryDisplay().bounds);
    }
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setResizable(false);
    // Live overlay is click-through; edit overlay must receive mouse events.
    if (mode === 'live') mainWindow.setIgnoreMouseEvents(true, { forward: true });
    else mainWindow.setIgnoreMouseEvents(false);
  }

  mainWindow.webContents.send('overlay:mode', overlayMode);
}

// Registers the overlay toggle accelerator, reverting to the previous one
// if the new accelerator is invalid or already taken by another app.
function registerOverlayShortcut(accel: string): boolean {
  if (hotkeyManager.setAccelerator(accel)) {
    overlayHotkey = accel;
    console.log('[Overlay] hotkey set:', accel);
    return true;
  }
  console.warn('[Overlay] invalid accelerator', accel, '— kept', overlayHotkey);
  return false;
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  wireIngameEvents();
  wireDraftEvents();
  createWindow();

  // Initialize DataDragon in background; after done, seed draft session with static data
  dataDragon = new DataDragonManager(app.getPath('userData'));
  dataDragon.initialize().then(async () => {
    const champions = await ChampionRepository.findAll();
    draftSession.setStaticData(
      champions.map(c => ({ id: c.id, name: c.name, tags: c.tags })),
      [],
    );
    console.log(`[Draft] Loaded ${champions.length} champions into draft session`);
  }).catch(err => console.error('[DataDragon] Init error:', err));

  // Apply saved API key + overlay hotkey if present
  const settings = await SettingsRepository.getSettings();
  if ((settings as any).apiKey) {
    riotClient.setApiKey((settings as any).apiKey);
  }
  registerOverlayShortcut((settings as any).overlayHotkey || DEFAULT_HOTKEY);
  hotkeyManager.start();

  // Start draft detector (wires LCU events → draftSession)
  new LcuDraftDetector(lcuConnector, draftSession);

  // The in-game tracker polls the Live Client API continuously and detects
  // a game on its own (independent of draft detection).
  liveTracker.start();

  lcuConnector.on('connect', () => {
    mainWindow?.webContents.send('lcu-status', 'connected');
    loadCurrentSummonerFromLcu().catch(err =>
      console.error('[LCU] Failed to load current summoner:', err),
    );
  });

  lcuConnector.on('disconnect', () => {
    mainWindow?.webContents.send('lcu-status', 'disconnected');
  });

  lcuConnector.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  hotkeyManager.stop();
});

app.on('window-all-closed', () => {
  lcuConnector.stop();
  if (process.platform !== 'darwin') app.quit();
});
