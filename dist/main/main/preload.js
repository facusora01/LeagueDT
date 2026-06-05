"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // ── Core ──────────────────────────────────────────────────────────────────
    ping: () => electron_1.ipcRenderer.invoke('ping'),
    getLcuStatus: () => electron_1.ipcRenderer.invoke('get-lcu-status'),
    onLcuStatusChange: (cb) => {
        electron_1.ipcRenderer.on('lcu-status', (_e, status) => cb(status));
    },
    // ── Settings ──────────────────────────────────────────────────────────────
    getSettings: () => electron_1.ipcRenderer.invoke('db:get-settings'),
    updateSettings: (s) => electron_1.ipcRenderer.invoke('db:update-settings', s),
    // ── Riot API ──────────────────────────────────────────────────────────────
    setApiKey: (key) => electron_1.ipcRenderer.invoke('riot:set-api-key', key),
    // ── Summoner ──────────────────────────────────────────────────────────────
    searchSummoner: (name, tag, region) => electron_1.ipcRenderer.invoke('summoner:search', name, tag, region),
    getAllSummoners: () => electron_1.ipcRenderer.invoke('summoner:get-all'),
    // ── Mastery ───────────────────────────────────────────────────────────────
    syncMastery: (summonerId) => electron_1.ipcRenderer.invoke('mastery:sync', summonerId),
    getMastery: (summonerId) => electron_1.ipcRenderer.invoke('mastery:get', summonerId),
    // ── Champions ─────────────────────────────────────────────────────────────
    getAllChampions: () => electron_1.ipcRenderer.invoke('champions:get-all'),
    getChampionById: (id) => electron_1.ipcRenderer.invoke('champions:get-by-id', id),
    // ── Match History ─────────────────────────────────────────────────────────
    syncMatches: (summonerId, count) => electron_1.ipcRenderer.invoke('matches:sync', summonerId, count),
    getMatches: (summonerId, limit) => electron_1.ipcRenderer.invoke('matches:get', summonerId, limit),
    // ── DataDragon ────────────────────────────────────────────────────────────
    getDDVersion: () => electron_1.ipcRenderer.invoke('datadragon:version'),
    // ── In-Game Coach ─────────────────────────────────────────────────────────
    startIngameCoach: () => electron_1.ipcRenderer.invoke('ingame:start'),
    stopIngameCoach: () => electron_1.ipcRenderer.invoke('ingame:stop'),
    onGameStarted: (cb) => electron_1.ipcRenderer.on('ingame:game-started', (_e, s) => cb(s)),
    onGameStateUpdate: (cb) => electron_1.ipcRenderer.on('ingame:state-updated', (_e, s) => cb(s)),
    onGameEnded: (cb) => electron_1.ipcRenderer.on('ingame:game-ended', () => cb()),
    onThreatsUpdate: (cb) => electron_1.ipcRenderer.on('ingame:threats', (_e, t) => cb(t)),
    onItemsUpdate: (cb) => electron_1.ipcRenderer.on('ingame:items', (_e, r) => cb(r)),
    onTipsUpdate: (cb) => electron_1.ipcRenderer.on('ingame:tips', (_e, t) => cb(t)),
    onGameEvents: (cb) => electron_1.ipcRenderer.on('ingame:events', (_e, e) => cb(e)),
    // ── Draft ─────────────────────────────────────────────────────────────────
    getDraftState: () => electron_1.ipcRenderer.invoke('draft:get-state'),
    onDraftStateChanged: (cb) => electron_1.ipcRenderer.on('draft:state-changed', (_e, state) => cb(state)),
    onDraftRecommendations: (cb) => electron_1.ipcRenderer.on('draft:recommendations', (_e, recs) => cb(recs)),
    onDraftBanSuggestions: (cb) => electron_1.ipcRenderer.on('draft:ban-suggestions', (_e, bans) => cb(bans)),
});
