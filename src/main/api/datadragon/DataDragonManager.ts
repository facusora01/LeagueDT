import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ChampionRepository } from '../../database/repositories/ChampionRepository';
import { ItemRepository } from '../../database/repositories/ItemRepository';
import type { Champion, Item } from '../../../shared/types';

const DD_BASE = 'https://ddragon.leagueoflegends.com';

export class DataDragonManager {
  private cacheDir: string;
  public currentVersion: string | null = null;
  public language = 'es_AR';

  constructor(userDataPath: string) {
    this.cacheDir = path.join(userDataPath, 'datadragon_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      const { data: versions } = await axios.get<string[]>(`${DD_BASE}/api/versions.json`);
      if (!versions?.length) return;

      this.currentVersion = versions[0];
      console.log(`[DataDragon] Latest version: ${this.currentVersion}`);

      await Promise.all([
        this.syncAndSeedChampions(),
        this.syncAndSeedItems(),
        this.syncRunes(),
      ]);
    } catch (err) {
      console.error('[DataDragon] Initialization failed:', err);
    }
  }

  private async fetchOrCache<T>(dataType: string): Promise<T | null> {
    if (!this.currentVersion) return null;

    const filePath = path.join(
      this.cacheDir,
      `${dataType}_${this.currentVersion}_${this.language}.json`,
    );

    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
      } catch {
        // corrupt cache — re-download
      }
    }

    try {
      const url = `${DD_BASE}/cdn/${this.currentVersion}/data/${this.language}/${dataType}.json`;
      const { data } = await axios.get<T>(url);
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
      console.log(`[DataDragon] Downloaded & cached ${dataType}`);
      return data;
    } catch (err) {
      console.error(`[DataDragon] Failed to fetch ${dataType}:`, err);
      return null;
    }
  }

  private async syncAndSeedChampions() {
    const dbVersion = await ChampionRepository.getVersion();
    if (dbVersion === this.currentVersion) {
      console.log('[DataDragon] Champions up to date in DB');
      return;
    }

    const raw = await this.fetchOrCache<any>('champion');
    if (!raw?.data) return;

    const champions: Champion[] = Object.values(raw.data).map((c: any) => ({
      id: Number(c.key),
      key: c.id,
      name: c.name,
      title: c.title,
      blurb: c.blurb,
      tags: c.tags,
      info: c.info,
      stats: c.stats,
      version: this.currentVersion!,
    }));

    await ChampionRepository.upsertMany(champions);
    console.log(`[DataDragon] Seeded ${champions.length} champions to DB`);
  }

  private async syncAndSeedItems() {
    const raw = await this.fetchOrCache<any>('item');
    if (!raw?.data) return;

    const items: Item[] = Object.entries(raw.data)
      .map(([idStr, i]: [string, any]) => ({
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
        version: this.currentVersion!,
      }))
      .filter(i => i.name); // skip blank items

    await ItemRepository.upsertMany(items);
    console.log(`[DataDragon] Seeded ${items.length} items to DB`);
  }

  private async syncRunes() {
    // Runes are read from cache; DB seeding deferred until RuneRepository exists
    await this.fetchOrCache<any>('runesReforged');
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getCachedData(dataType: 'champion' | 'item' | 'runesReforged'): any | null {
    if (!this.currentVersion) return null;
    const filePath = path.join(
      this.cacheDir,
      `${dataType}_${this.currentVersion}_${this.language}.json`,
    );
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return null;
    }
  }

  getChampionSquareUrl(championKey: string): string {
    if (!this.currentVersion) return '';
    return `${DD_BASE}/cdn/${this.currentVersion}/img/champion/${championKey}.png`;
  }

  getItemIconUrl(itemId: number): string {
    if (!this.currentVersion) return '';
    return `${DD_BASE}/cdn/${this.currentVersion}/img/item/${itemId}.png`;
  }

  getProfileIconUrl(iconId: number): string {
    if (!this.currentVersion) return '';
    return `${DD_BASE}/cdn/${this.currentVersion}/img/profileicon/${iconId}.png`;
  }
}
