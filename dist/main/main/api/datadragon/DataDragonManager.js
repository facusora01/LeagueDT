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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataDragonManager = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ChampionRepository_1 = require("../../database/repositories/ChampionRepository");
const ItemRepository_1 = require("../../database/repositories/ItemRepository");
const DD_BASE = 'https://ddragon.leagueoflegends.com';
class DataDragonManager {
    cacheDir;
    currentVersion = null;
    language = 'es_AR';
    constructor(userDataPath) {
        this.cacheDir = path.join(userDataPath, 'datadragon_cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    async initialize() {
        try {
            const { data: versions } = await axios_1.default.get(`${DD_BASE}/api/versions.json`);
            if (!versions?.length)
                return;
            this.currentVersion = versions[0];
            console.log(`[DataDragon] Latest version: ${this.currentVersion}`);
            await Promise.all([
                this.syncAndSeedChampions(),
                this.syncAndSeedItems(),
                this.syncRunes(),
            ]);
        }
        catch (err) {
            console.error('[DataDragon] Initialization failed:', err);
        }
    }
    async fetchOrCache(dataType) {
        if (!this.currentVersion)
            return null;
        const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
        if (fs.existsSync(filePath)) {
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            catch {
                // corrupt cache — re-download
            }
        }
        try {
            const url = `${DD_BASE}/cdn/${this.currentVersion}/data/${this.language}/${dataType}.json`;
            const { data } = await axios_1.default.get(url);
            fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
            console.log(`[DataDragon] Downloaded & cached ${dataType}`);
            return data;
        }
        catch (err) {
            console.error(`[DataDragon] Failed to fetch ${dataType}:`, err);
            return null;
        }
    }
    async syncAndSeedChampions() {
        const dbVersion = await ChampionRepository_1.ChampionRepository.getVersion();
        if (dbVersion === this.currentVersion) {
            console.log('[DataDragon] Champions up to date in DB');
            return;
        }
        const raw = await this.fetchOrCache('champion');
        if (!raw?.data)
            return;
        const champions = Object.values(raw.data).map((c) => ({
            id: Number(c.key),
            key: c.id,
            name: c.name,
            title: c.title,
            blurb: c.blurb,
            tags: c.tags,
            info: c.info,
            stats: c.stats,
            version: this.currentVersion,
        }));
        await ChampionRepository_1.ChampionRepository.upsertMany(champions);
        console.log(`[DataDragon] Seeded ${champions.length} champions to DB`);
    }
    async syncAndSeedItems() {
        const raw = await this.fetchOrCache('item');
        if (!raw?.data)
            return;
        const items = Object.entries(raw.data)
            .map(([idStr, i]) => ({
            id: Number(idStr),
            name: i.name ?? '',
            description: i.description ?? '',
            plaintext: i.plaintext ?? '',
            into: i.into?.map(Number) ?? [],
            from: i.from?.map(Number) ?? [],
            gold: {
                base: i.gold?.base ?? 0,
                total: i.gold?.total ?? 0,
                sell: i.gold?.sell ?? 0,
                purchaseable: i.gold?.purchasable ?? true,
            },
            tags: i.tags ?? [],
            stats: i.stats ?? {},
            version: this.currentVersion,
        }))
            .filter(i => i.name); // skip blank items
        await ItemRepository_1.ItemRepository.upsertMany(items);
        console.log(`[DataDragon] Seeded ${items.length} items to DB`);
    }
    async syncRunes() {
        // Runes are read from cache; DB seeding deferred until RuneRepository exists
        await this.fetchOrCache('runesReforged');
    }
    // ── Accessors ─────────────────────────────────────────────────────────────
    getCachedData(dataType) {
        if (!this.currentVersion)
            return null;
        const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
        if (!fs.existsSync(filePath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        catch {
            return null;
        }
    }
    getChampionSquareUrl(championKey) {
        if (!this.currentVersion)
            return '';
        return `${DD_BASE}/cdn/${this.currentVersion}/img/champion/${championKey}.png`;
    }
    getItemIconUrl(itemId) {
        if (!this.currentVersion)
            return '';
        return `${DD_BASE}/cdn/${this.currentVersion}/img/item/${itemId}.png`;
    }
    getProfileIconUrl(iconId) {
        if (!this.currentVersion)
            return '';
        return `${DD_BASE}/cdn/${this.currentVersion}/img/profileicon/${iconId}.png`;
    }
}
exports.DataDragonManager = DataDragonManager;
