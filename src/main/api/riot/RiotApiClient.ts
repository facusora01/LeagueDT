import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from './RateLimiter';

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
  VN2 = 'vn2'
}

export enum RiotRoutingValue {
  AMERICAS = 'americas',
  ASIA = 'asia',
  EUROPE = 'europe',
  SEA = 'sea'
}

export class RiotApiClient {
  private apiKey: string;
  private limiter: RateLimiter;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RIOT_API_KEY || '';
    this.limiter = new RateLimiter();
    this.client = axios.create({
      headers: {
        'X-Riot-Token': this.apiKey
      }
    });
  }

  public setApiKey(key: string) {
    this.apiKey = key;
    this.client.defaults.headers['X-Riot-Token'] = key;
  }

  /**
   * Maps a region to its larger routing value (e.g. LA2 -> AMERICAS)
   * Required for Account-V1 and Match-V5 endpoints
   */
  public getRoutingValue(region: RiotRegion): RiotRoutingValue {
    const americas = [RiotRegion.NA1, RiotRegion.BR1, RiotRegion.LA1, RiotRegion.LA2];
    const europe = [RiotRegion.EUW1, RiotRegion.EUN1, RiotRegion.TR1, RiotRegion.RU];
    const asia = [RiotRegion.KR, RiotRegion.JP1];
    
    if (americas.includes(region)) return RiotRoutingValue.AMERICAS;
    if (europe.includes(region)) return RiotRoutingValue.EUROPE;
    if (asia.includes(region)) return RiotRoutingValue.ASIA;
    
    return RiotRoutingValue.SEA; // fallback for SEA regions
  }

  private buildUrl(regionOrRouting: RiotRegion | RiotRoutingValue, path: string): string {
    return `https://${regionOrRouting}.api.riotgames.com${path}`;
  }

  /**
   * Makes a rate-limited request to the Riot API
   */
  public async get<T>(regionOrRouting: RiotRegion | RiotRoutingValue, path: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Riot API Key is not set. Please set RIOT_API_KEY in your .env file or UI.');
    }

    const url = this.buildUrl(regionOrRouting, path);

    return this.limiter.execute(async () => {
      const response = await this.client.get<T>(url);
      return response.data;
    });
  }

  // --- Common Endpoint Helpers --- //

  public async getAccountByRiotId(puuidRegion: RiotRoutingValue, gameName: string, tagLine: string) {
    return this.get(puuidRegion, `/riot/account/v1/accounts/by-riot-id/${encodeURI(gameName)}/${encodeURI(tagLine)}`);
  }

  public async getSummonerByPuuid(region: RiotRegion, puuid: string) {
    return this.get(region, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
  }
}
