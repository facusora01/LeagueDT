import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Core ──────────────────────────────────────────────────────────────────
  ping: () => ipcRenderer.invoke('ping'),
  getLcuStatus: () => ipcRenderer.invoke('get-lcu-status'),
  onLcuStatusChange: (cb: (s: 'connected' | 'disconnected') => void) => {
    ipcRenderer.on('lcu-status', (_e, status) => cb(status));
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  updateSettings: (s: any) => ipcRenderer.invoke('db:update-settings', s),

  // ── Riot API ──────────────────────────────────────────────────────────────
  setApiKey: (key: string) => ipcRenderer.invoke('riot:set-api-key', key),

  // ── Summoner ──────────────────────────────────────────────────────────────
  searchSummoner: (name: string, tag: string, region: string) =>
    ipcRenderer.invoke('summoner:search', name, tag, region),
  getAllSummoners: () => ipcRenderer.invoke('summoner:get-all'),
  onCurrentSummoner: (cb: (s: any) => void) =>
    ipcRenderer.on('summoner:current', (_e, s) => cb(s)),
  onMasterySynced: (cb: (id: string) => void) =>
    ipcRenderer.on('summoner:mastery-synced', (_e, id) => cb(id)),

  // ── Mastery ───────────────────────────────────────────────────────────────
  syncMastery: (summonerId: string) => ipcRenderer.invoke('mastery:sync', summonerId),
  getMastery: (summonerId: string) => ipcRenderer.invoke('mastery:get', summonerId),

  // ── Champions ─────────────────────────────────────────────────────────────
  getAllChampions: () => ipcRenderer.invoke('champions:get-all'),
  getChampionById: (id: number) => ipcRenderer.invoke('champions:get-by-id', id),

  // ── Match History ─────────────────────────────────────────────────────────
  syncMatches: (summonerId: string, count?: number) =>
    ipcRenderer.invoke('matches:sync', summonerId, count),
  getMatches: (summonerId: string, limit?: number) =>
    ipcRenderer.invoke('matches:get', summonerId, limit),

  // ── DataDragon ────────────────────────────────────────────────────────────
  getDDVersion: () => ipcRenderer.invoke('datadragon:version'),

  // ── Dev simulation ────────────────────────────────────────────────────────
  simulateDraft: (phase: 'pick' | 'ban') => ipcRenderer.invoke('dev:simulate-draft', phase),
  simulateGame: () => ipcRenderer.invoke('dev:simulate-game'),
  stopSimulation: () => ipcRenderer.invoke('dev:stop-sim'),

  // ── In-Game Coach ─────────────────────────────────────────────────────────
  startIngameCoach: () => ipcRenderer.invoke('ingame:start'),
  stopIngameCoach:  () => ipcRenderer.invoke('ingame:stop'),
  onGameStarted:    (cb: (s: any) => void) => ipcRenderer.on('ingame:game-started',  (_e, s) => cb(s)),
  onGameStateUpdate:(cb: (s: any) => void) => ipcRenderer.on('ingame:state-updated', (_e, s) => cb(s)),
  onGameEnded:      (cb: () => void)       => ipcRenderer.on('ingame:game-ended',     () => cb()),
  onThreatsUpdate:  (cb: (t: any[]) => void) => ipcRenderer.on('ingame:threats', (_e, t) => cb(t)),
  onItemsUpdate:    (cb: (r: any) => void)   => ipcRenderer.on('ingame:items',   (_e, r) => cb(r)),
  onTipsUpdate:     (cb: (t: any[]) => void) => ipcRenderer.on('ingame:tips',    (_e, t) => cb(t)),
  onGameEvents:     (cb: (e: any[]) => void) => ipcRenderer.on('ingame:events',  (_e, e) => cb(e)),

  // ── Draft ─────────────────────────────────────────────────────────────────
  getDraftState: () => ipcRenderer.invoke('draft:get-state'),
  onDraftStateChanged: (cb: (state: any) => void) =>
    ipcRenderer.on('draft:state-changed', (_e, state) => cb(state)),
  onDraftRecommendations: (cb: (recs: any[]) => void) =>
    ipcRenderer.on('draft:recommendations', (_e, recs) => cb(recs)),
  onDraftBanSuggestions: (cb: (bans: any[]) => void) =>
    ipcRenderer.on('draft:ban-suggestions', (_e, bans) => cb(bans)),
});
