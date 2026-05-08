"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiotApiClient = exports.RiotRoutingValue = exports.RiotRegion = void 0;
const axios_1 = __importDefault(require("axios"));
const RateLimiter_1 = require("./RateLimiter");
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
class RiotApiClient {
    apiKey;
    limiter;
    client;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.RIOT_API_KEY || '';
        this.limiter = new RateLimiter_1.RateLimiter();
        this.client = axios_1.default.create({
            headers: {
                'X-Riot-Token': this.apiKey
            }
        });
    }
    setApiKey(key) {
        this.apiKey = key;
        this.client.defaults.headers['X-Riot-Token'] = key;
    }
    /**
     * Maps a region to its larger routing value (e.g. LA2 -> AMERICAS)
     * Required for Account-V1 and Match-V5 endpoints
     */
    getRoutingValue(region) {
        const americas = [RiotRegion.NA1, RiotRegion.BR1, RiotRegion.LA1, RiotRegion.LA2];
        const europe = [RiotRegion.EUW1, RiotRegion.EUN1, RiotRegion.TR1, RiotRegion.RU];
        const asia = [RiotRegion.KR, RiotRegion.JP1];
        if (americas.includes(region))
            return RiotRoutingValue.AMERICAS;
        if (europe.includes(region))
            return RiotRoutingValue.EUROPE;
        if (asia.includes(region))
            return RiotRoutingValue.ASIA;
        return RiotRoutingValue.SEA; // fallback for SEA regions
    }
    buildUrl(regionOrRouting, path) {
        return `https://${regionOrRouting}.api.riotgames.com${path}`;
    }
    /**
     * Makes a rate-limited request to the Riot API
     */
    async get(regionOrRouting, path) {
        if (!this.apiKey) {
            throw new Error('Riot API Key is not set. Please set RIOT_API_KEY in your .env file or UI.');
        }
        const url = this.buildUrl(regionOrRouting, path);
        return this.limiter.execute(async () => {
            const response = await this.client.get(url);
            return response.data;
        });
    }
    // --- Common Endpoint Helpers --- //
    async getAccountByRiotId(puuidRegion, gameName, tagLine) {
        return this.get(puuidRegion, `/riot/account/v1/accounts/by-riot-id/${encodeURI(gameName)}/${encodeURI(tagLine)}`);
    }
    async getSummonerByPuuid(region, puuid) {
        return this.get(region, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    }
}
exports.RiotApiClient = RiotApiClient;
