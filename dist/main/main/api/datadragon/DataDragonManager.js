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
    /**
     * Initializes the manager by finding the latest version and downloading base data
     */
    async initialize() {
        try {
            // Get latest versions
            const response = await axios_1.default.get('https://ddragon.leagueoflegends.com/api/versions.json');
            const versions = response.data;
            if (versions && versions.length > 0) {
                this.currentVersion = versions[0];
                console.log(`[DataDragon] Latest version is ${this.currentVersion}`);
                // Ensure we have champions and items cached for this version
                await this.syncData('champion');
                await this.syncData('item');
            }
        }
        catch (err) {
            console.error('[DataDragon] Initialization failed:', err);
        }
    }
    async syncData(dataType) {
        if (!this.currentVersion)
            return;
        const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
        // Check if we already have it cached
        if (fs.existsSync(filePath)) {
            return;
        }
        try {
            console.log(`[DataDragon] Downloading ${dataType} data for ${this.currentVersion}...`);
            const url = `https://ddragon.leagueoflegends.com/cdn/${this.currentVersion}/data/${this.language}/${dataType}.json`;
            const response = await axios_1.default.get(url);
            fs.writeFileSync(filePath, JSON.stringify(response.data), 'utf8');
            console.log(`[DataDragon] Saved ${dataType} to cache.`);
        }
        catch (err) {
            console.error(`[DataDragon] Failed to sync ${dataType}:`, err);
        }
    }
    getCachedData(dataType) {
        if (!this.currentVersion)
            return null;
        const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            }
            catch (err) {
                console.error(`[DataDragon] Failed to read cached ${dataType}:`, err);
                return null;
            }
        }
        return null;
    }
    getChampionSquareUrl(championId) {
        if (!this.currentVersion)
            return '';
        return `https://ddragon.leagueoflegends.com/cdn/${this.currentVersion}/img/champion/${championId}.png`;
    }
}
exports.DataDragonManager = DataDragonManager;
