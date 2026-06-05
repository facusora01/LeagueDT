"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiotApiClient = exports.RiotRoutingValue = exports.RiotRegion = void 0;
const axios_1 = __importDefault(require("axios"));
const RateLimiter_1 = require("./RateLimiter");
const ApiCache_1 = require("./ApiCache");
var RiotRegion;
(function (RiotRegion) {
    RiotRegion["BR1"] = "br1";
    RiotRegion["EUN1"] = "eun1";
    RiotRegion["EUW1"] = "euw1";
    RiotRegion["JP1"] = "jp1";
    RiotRegion["KR"] = "kr";
    RiotRegion["LA1"] = "la1";
    RiotRegion["LA2"] = "la2";
    RiotRegion["NA1"] = "na1";
    RiotRegion["OC1"] = "oc1";
    RiotRegion["PH2"] = "ph2";
    RiotRegion["RU"] = "ru";
    RiotRegion["SG2"] = "sg2";
    RiotRegion["TH2"] = "th2";
    RiotRegion["TR1"] = "tr1";
    RiotRegion["TW2"] = "tw2";
    RiotRegion["VN2"] = "vn2";
})(RiotRegion || (exports.RiotRegion = RiotRegion = {}));
var RiotRoutingValue;
(function (RiotRoutingValue) {
    RiotRoutingValue["AMERICAS"] = "americas";
    RiotRoutingValue["ASIA"] = "asia";
    RiotRoutingValue["EUROPE"] = "europe";
    RiotRoutingValue["SEA"] = "sea";
})(RiotRoutingValue || (exports.RiotRoutingValue = RiotRoutingValue = {}));
// Cache TTLs
const TTL = {
    ACCOUNT: 5 * 60 * 1000, // 5 min
    SUMMONER: 5 * 60 * 1000, // 5 min
    MASTERY: 10 * 60 * 1000, // 10 min
    MATCH_LIST: 2 * 60 * 1000, // 2 min
    MATCH: 60 * 60 * 1000, // 1 hr (matches don't change)
    RANKED: 5 * 60 * 1000, // 5 min
    LIVE_GAME: 30 * 1000, // 30 sec (live data)
};
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
class RiotApiClient {
    apiKey;
    limiter;
    cache;
    client;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.RIOT_API_KEY || '';
        this.limiter = new RateLimiter_1.RateLimiter();
        this.cache = new ApiCache_1.ApiCache();
        this.client = axios_1.default.create({
            headers: { 'X-Riot-Token': this.apiKey },
        });
    }
    setApiKey(key) {
        this.apiKey = key;
        this.client.defaults.headers['X-Riot-Token'] = key;
        this.cache.clear();
    }
    getRoutingValue(region) {
        if ([RiotRegion.NA1, RiotRegion.BR1, RiotRegion.LA1, RiotRegion.LA2].includes(region))
            return RiotRoutingValue.AMERICAS;
        if ([RiotRegion.EUW1, RiotRegion.EUN1, RiotRegion.TR1, RiotRegion.RU].includes(region))
            return RiotRoutingValue.EUROPE;
        if ([RiotRegion.KR, RiotRegion.JP1].includes(region))
            return RiotRoutingValue.ASIA;
        return RiotRoutingValue.SEA;
    }
    buildUrl(host, path) {
        return `https://${host}.api.riotgames.com${path}`;
    }
    async get(host, path, cacheKey, ttlMs) {
        if (!this.apiKey)
            throw new Error('Riot API Key not set');
        if (cacheKey && ttlMs) {
            const cached = this.cache.get(cacheKey);
            if (cached !== null)
                return cached;
        }
        const url = this.buildUrl(host, path);
        const result = await this.limiter.execute(() => this.requestWithRetry(url));
        if (cacheKey && ttlMs) {
            this.cache.set(cacheKey, result, ttlMs);
        }
        return result;
    }
    async requestWithRetry(url, attempt = 0) {
        try {
            const response = await this.client.get(url);
            return response.data;
        }
        catch (err) {
            const error = err;
            const status = error.response?.status;
            // Don't retry client errors except 429 (handled by RateLimiter)
            if (status && status >= 400 && status < 500 && status !== 429) {
                throw error;
            }
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_MS * Math.pow(2, attempt);
                await new Promise(r => setTimeout(r, delay));
                return this.requestWithRetry(url, attempt + 1);
            }
            throw error;
        }
    }
    // ── Account v1 ────────────────────────────────────────────────────────────
    async getAccountByRiotId(routing, gameName, tagLine) {
        const key = `account:${routing}:${gameName}#${tagLine}`;
        return this.get(routing, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, key, TTL.ACCOUNT);
    }
    async getAccountByPuuid(routing, puuid) {
        const key = `account:puuid:${puuid}`;
        return this.get(routing, `/riot/account/v1/accounts/by-puuid/${puuid}`, key, TTL.ACCOUNT);
    }
    // ── Summoner v4 ───────────────────────────────────────────────────────────
    async getSummonerByPuuid(region, puuid) {
        const key = `summoner:puuid:${region}:${puuid}`;
        return this.get(region, `/lol/summoner/v4/summoners/by-puuid/${puuid}`, key, TTL.SUMMONER);
    }
    // ── Champion Mastery v4 ───────────────────────────────────────────────────
    async getAllChampionMasteries(region, puuid) {
        const key = `mastery:all:${region}:${puuid}`;
        return this.get(region, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`, key, TTL.MASTERY);
    }
    async getTopChampionMasteries(region, puuid, count = 10) {
        const key = `mastery:top${count}:${region}:${puuid}`;
        return this.get(region, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`, key, TTL.MASTERY);
    }
    // ── Match v5 ──────────────────────────────────────────────────────────────
    async getMatchIdsByPuuid(routing, puuid, options = {}) {
        const params = new URLSearchParams();
        if (options.queue !== undefined)
            params.set('queue', String(options.queue));
        if (options.type)
            params.set('type', options.type);
        if (options.start !== undefined)
            params.set('start', String(options.start));
        if (options.count !== undefined)
            params.set('count', String(options.count));
        const qs = params.toString();
        const key = `matchlist:${routing}:${puuid}:${qs}`;
        return this.get(routing, `/lol/match/v5/matches/by-puuid/${puuid}/ids${qs ? `?${qs}` : ''}`, key, TTL.MATCH_LIST);
    }
    async getMatch(routing, matchId) {
        const key = `match:${matchId}`;
        return this.get(routing, `/lol/match/v5/matches/${matchId}`, key, TTL.MATCH);
    }
    async getMatchTimeline(routing, matchId) {
        const key = `timeline:${matchId}`;
        return this.get(routing, `/lol/match/v5/matches/${matchId}/timeline`, key, TTL.MATCH);
    }
    // ── Spectator v5 ──────────────────────────────────────────────────────────
    async getLiveGame(region, puuid) {
        // Live game data not cached aggressively
        const key = `livegame:${region}:${puuid}`;
        return this.get(region, `/lol/spectator/v5/active-games/by-summoner/${puuid}`, key, TTL.LIVE_GAME);
    }
    // ── League v4 ─────────────────────────────────────────────────────────────
    async getRankedStats(region, summonerId) {
        const key = `ranked:${region}:${summonerId}`;
        return this.get(region, `/lol/league/v4/entries/by-summoner/${summonerId}`, key, TTL.RANKED);
    }
}
exports.RiotApiClient = RiotApiClient;
