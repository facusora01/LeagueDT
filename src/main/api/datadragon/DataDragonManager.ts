import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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

  /**
   * Initializes the manager by finding the latest version and downloading base data
   */
  public async initialize() {
    try {
      // Get latest versions
      const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
      const versions = response.data;
      if (versions && versions.length > 0) {
        this.currentVersion = versions[0];
        console.log(`[DataDragon] Latest version is ${this.currentVersion}`);
        
        // Ensure we have champions and items cached for this version
        await this.syncData('champion');
        await this.syncData('item');
      }
    } catch (err) {
      console.error('[DataDragon] Initialization failed:', err);
    }
  }

  private async syncData(dataType: 'champion' | 'item' | 'runesReforged') {
    if (!this.currentVersion) return;
    
    const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
    
    // Check if we already have it cached
    if (fs.existsSync(filePath)) {
      return;
    }

    try {
      console.log(`[DataDragon] Downloading ${dataType} data for ${this.currentVersion}...`);
      const url = `https://ddragon.leagueoflegends.com/cdn/${this.currentVersion}/data/${this.language}/${dataType}.json`;
      const response = await axios.get(url);
      
      fs.writeFileSync(filePath, JSON.stringify(response.data), 'utf8');
      console.log(`[DataDragon] Saved ${dataType} to cache.`);
    } catch (err) {
      console.error(`[DataDragon] Failed to sync ${dataType}:`, err);
    }
  }

  public getCachedData(dataType: 'champion' | 'item' | 'runesReforged'): any | null {
    if (!this.currentVersion) return null;
    
    const filePath = path.join(this.cacheDir, `${dataType}_${this.currentVersion}_${this.language}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`[DataDragon] Failed to read cached ${dataType}:`, err);
        return null;
      }
    }
    return null;
  }

  public getChampionSquareUrl(championId: string): string {
    if (!this.currentVersion) return '';
    return `https://ddragon.leagueoflegends.com/cdn/${this.currentVersion}/img/champion/${championId}.png`;
  }
}
