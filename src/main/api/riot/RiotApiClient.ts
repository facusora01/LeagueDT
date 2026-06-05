import axios, { AxiosInstance, AxiosError } from 'axios';
import { RateLimiter } from './RateLimiter';
import { ApiCache } from './ApiCache';

export enum RiotRegion {
  BR1 = 'br1',
  EUN1 = 'eun1',
  EUW1 = 'euw1',
  JP1 = 'jp1',
  KR = 'kr',
  LA1 = 'la1',
  LA2 = 'la2',
  NA1 = 'na1',
  OC1 = 'oc1',
  PH2 = 'ph2',
  RU = 'ru',
  SG2 = 'sg2',
  TH2 = 'th2',
  TR1 = 'tr1',
  TW2 = 'tw2',
  VN2 = 'vn2',
}

export enum RiotRoutingValue {
  AMERICAS = 'americas',
  ASIA = 'asia',
  EUROPE = 'europe',
  SEA = 'sea',
}

// Cache TTLs
const TTL = {
  ACCOUNT: 5 * 60 * 1000,        // 5 min
  SUMMONER: 5 * 60 * 1000,        // 5 min
  MASTERY: 10 * 60 * 1000,        // 10 min
  MATCH_LIST: 2 * 60 * 1000,      // 2 min
  MATCH: 60 * 60 * 1000,          // 1 hr (matches don't change)
  RANKED: 5 * 60 * 1000,          // 5 min
  LIVE_GAME: 30 * 1000,           // 30 sec (live data)
} as const;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface ChampionMasteryDto {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted: boolean;
  tokensEarned: number;
  summonerId: string;
}

export interface MatchListOptions {
  queue?: number;
  type?: string;
  start?: number;
  count?: number;
}

export interface LeagueEntryDto {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export class RiotApiClient {
  private apiKey: string;
  private limiter: RateLimiter;
  private cache: ApiCache;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RIOT_API_KEY || '';
    this.limiter = new RateLimiter();
    this.cache = new ApiCache();
    this.client = axios.create({
      headers: { 'X-Riot-Token': this.apiKey },
    });
  }

  setApiKey(key: string) {
    this.apiKey = key;
    this.client.defaults.headers['X-Riot-Token'] = key;
    this.cache.clear();
  }

  getRoutingValue(region: RiotRegion): RiotRoutingValue {
    if ([RiotRegion.NA1, RiotRegion.BR1, RiotRegion.LA1, RiotRegion.LA2].includes(region))
      return RiotRoutingValue.AMERICAS;
    if ([RiotRegion.EUW1, RiotRegion.EUN1, RiotRegion.TR1, RiotRegion.RU].includes(region))
      return RiotRoutingValue.EUROPE;
    if ([RiotRegion.KR, RiotRegion.JP1].includes(region))
      return RiotRoutingValue.ASIA;
    return RiotRoutingValue.SEA;
  }

  private buildUrl(host: RiotRegion | RiotRoutingValue, path: string): string {
    return `https://${host}.api.riotgames.com${path}`;
  }

  private async get<T>(
    host: RiotRegion | RiotRoutingValue,
    path: string,
    cacheKey?: string,
    ttlMs?: number,
  ): Promise<T> {
    if (!this.apiKey) throw new Error('Riot API Key not set');

    if (cacheKey && ttlMs) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) return cached;
    }

    const url = this.buildUrl(host, path);
    const result = await this.limiter.execute(() => this.requestWithRetry<T>(url));

    if (cacheKey && ttlMs) {
      this.cache.set(cacheKey, result, ttlMs);
    }
    return result;
  }

  private async requestWithRetry<T>(url: string, attempt = 0): Promise<T> {
    try {
      const response = await this.client.get<T>(url);
      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;

      // Don't retry client errors except 429 (handled by RateLimiter)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return this.requestWithRetry<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  // ── Account v1 ────────────────────────────────────────────────────────────

  async getAccountByRiotId(
    routing: RiotRoutingValue,
    gameName: string,
    tagLine: string,
  ): Promise<RiotAccount> {
    const key = `account:${routing}:${gameName}#${tagLine}`;
    return this.get<RiotAccount>(
      routing,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      key,
      TTL.ACCOUNT,
    );
  }

  async getAccountByPuuid(routing: RiotRoutingValue, puuid: string): Promise<RiotAccount> {
    const key = `account:puuid:${puuid}`;
    return this.get<RiotAccount>(
      routing,
      `/riot/account/v1/accounts/by-puuid/${puuid}`,
      key,
      TTL.ACCOUNT,
    );
  }

  // ── Summoner v4 ───────────────────────────────────────────────────────────

  async getSummonerByPuuid(region: RiotRegion, puuid: string): Promise<RiotSummoner> {
    const key = `summoner:puuid:${region}:${puuid}`;
    return this.get<RiotSummoner>(
      region,
      `/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      key,
      TTL.SUMMONER,
    );
  }

  // ── Champion Mastery v4 ───────────────────────────────────────────────────

  async getAllChampionMasteries(
    region: RiotRegion,
    puuid: string,
  ): Promise<ChampionMasteryDto[]> {
    const key = `mastery:all:${region}:${puuid}`;
    return this.get<ChampionMasteryDto[]>(
      region,
      `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`,
      key,
      TTL.MASTERY,
    );
  }

  async getTopChampionMasteries(
    region: RiotRegion,
    puuid: string,
    count = 10,
  ): Promise<ChampionMasteryDto[]> {
    const key = `mastery:top${count}:${region}:${puuid}`;
    return this.get<ChampionMasteryDto[]>(
      region,
      `/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`,
      key,
      TTL.MASTERY,
    );
  }

  // ── Match v5 ──────────────────────────────────────────────────────────────

  async getMatchIdsByPuuid(
    routing: RiotRoutingValue,
    puuid: string,
    options: MatchListOptions = {},
  ): Promise<string[]> {
    const params = new URLSearchParams();
    if (options.queue !== undefined) params.set('queue', String(options.queue));
    if (options.type) params.set('type', options.type);
    if (options.start !== undefined) params.set('start', String(options.start));
    if (options.count !== undefined) params.set('count', String(options.count));

    const qs = params.toString();
    const key = `matchlist:${routing}:${puuid}:${qs}`;
    return this.get<string[]>(
      routing,
      `/lol/match/v5/matches/by-puuid/${puuid}/ids${qs ? `?${qs}` : ''}`,
      key,
      TTL.MATCH_LIST,
    );
  }

  async getMatch(routing: RiotRoutingValue, matchId: string): Promise<any> {
    const key = `match:${matchId}`;
    return this.get<any>(
      routing,
      `/lol/match/v5/matches/${matchId}`,
      key,
      TTL.MATCH,
    );
  }

  async getMatchTimeline(routing: RiotRoutingValue, matchId: string): Promise<any> {
    const key = `timeline:${matchId}`;
    return this.get<any>(
      routing,
      `/lol/match/v5/matches/${matchId}/timeline`,
      key,
      TTL.MATCH,
    );
  }

  // ── Spectator v5 ──────────────────────────────────────────────────────────

  async getLiveGame(region: RiotRegion, puuid: string): Promise<any> {
    // Live game data not cached aggressively
    const key = `livegame:${region}:${puuid}`;
    return this.get<any>(
      region,
      `/lol/spectator/v5/active-games/by-summoner/${puuid}`,
      key,
      TTL.LIVE_GAME,
    );
  }

  // ── League v4 ─────────────────────────────────────────────────────────────

  async getRankedStats(region: RiotRegion, summonerId: string): Promise<LeagueEntryDto[]> {
    const key = `ranked:${region}:${summonerId}`;
    return this.get<LeagueEntryDto[]>(
      region,
      `/lol/league/v4/entries/by-summoner/${summonerId}`,
      key,
      TTL.RANKED,
    );
  }
}
