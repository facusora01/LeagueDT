import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

const execAsync = util.promisify(exec);

export interface LcuCredentials {
  port: string;
  password: string;
  protocol: string;
}

export class LcuConnector extends EventEmitter {
  private defaultPath = 'C:\\Riot Games\\League of Legends';
  private lockfilePath: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;
  public credentials: LcuCredentials | null = null;
  public isConnected = false;
  private isSearchingPath = false;

  constructor(customPath?: string) {
    super();
    if (customPath) {
      this.lockfilePath = path.join(customPath, 'lockfile');
    }
  }

  /**
   * Starts polling for the League Client lockfile
   */
  public start() {
    if (this.pollInterval) return;
    
    // Check every 2 seconds
    this.pollInterval = setInterval(() => {
      this.checkLockfile();
    }, 2000);
    
    // Check immediately
    this.checkLockfile();
  }

  public stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.handleDisconnect();
  }

  private async checkLockfile() {
    // If we're already connected, check if process died
    if (this.isConnected && this.lockfilePath) {
      if (!fs.existsSync(this.lockfilePath)) {
        console.log('[LCU] Lockfile deleted. Disconnecting.');
        this.handleDisconnect();
      }
      return;
    }

    if (this.ws) {
      // Already trying to connect
      return;
    }

    // Try to find path if we don't have it
    if (!this.lockfilePath && !this.isSearchingPath) {
      this.isSearchingPath = true;
      try {
        const { stdout } = await execAsync('wmic process where "name=\'LeagueClientUx.exe\'" get ExecutablePath');
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('LeagueClientUx.exe')) {
            const fullPath = line.trim();
            this.lockfilePath = path.join(path.dirname(fullPath), 'lockfile');
            console.log('[LCU] Found game path:', path.dirname(fullPath));
            break;
          }
        }
      } catch (err) {
        console.error('[LCU] WMI command failed:', err);
        // Fallback to default path if WMI fails
        this.lockfilePath = path.join(this.defaultPath, 'lockfile');
      }
      this.isSearchingPath = false;
    }

    // Try to read lockfile
    if (this.lockfilePath) {
      if (fs.existsSync(this.lockfilePath)) {
        try {
          const contents = fs.readFileSync(this.lockfilePath, 'utf8');
          const parts = contents.split(':');
          
          if (parts.length >= 5) {
            this.credentials = {
              port: parts[2],
              password: parts[3],
              protocol: parts[4]
            };
            console.log(`[LCU] Read credentials from lockfile. Port: ${this.credentials.port}`);
            this.connectWebSocket();
          }
        } catch (err) {
          console.error('[LCU] Error reading lockfile:', err);
        }
      } else {
        // Only log once to avoid spamming
        // console.log(`[LCU] Waiting for lockfile at ${this.lockfilePath}`);
      }
    }
  }

  private connectWebSocket() {
    if (!this.credentials) return;

    const url = `wss://127.0.0.1:${this.credentials.port}/`;
    const auth = Buffer.from(`riot:${this.credentials.password}`).toString('base64');

    console.log(`[LCU] Connecting to WebSocket at ${url}`);

    this.ws = new WebSocket(url, 'wamp', {
      headers: {
        Authorization: `Basic ${auth}`
      },
      rejectUnauthorized: false
    });

    this.ws.on('open', () => {
      console.log('[LCU] WebSocket connected successfully!');
      this.isConnected = true;
      this.emit('connect', this.credentials);
      
      // Subscribe to all JSON events
      if (this.ws) {
        this.ws.send(JSON.stringify([5, 'OnJsonApiEvent']));
      }
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = data.toString();
        // WAMP format: [opcode, eventName, data]
        if (message) {
          const parsed = JSON.parse(message);
          if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0] === 8) {
            const eventName = parsed[1];
            const eventData = parsed[2];
            this.emit('message', { eventName, data: eventData });
            
            // Forward specific events we care about
            if (eventData && eventData.uri) {
              this.emit(eventData.uri, eventData);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    this.ws.on('close', () => {
      this.handleDisconnect();
    });

    this.ws.on('error', (err: NodeJS.ErrnoException) => {
      // ECONNREFUSED is expected while the client is still booting — the
      // lockfile exists but the WS port isn't accepting connections yet.
      // Stay quiet and let the next poll retry.
      if (err.code !== 'ECONNREFUSED') {
        console.error('[LCU] WebSocket error:', err.message);
      }
      this.handleDisconnect();
    });
  }

  private handleDisconnect() {
    if (this.isConnected) {
      this.isConnected = false;
      this.credentials = null;
      this.emit('disconnect');
    }
    
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (e) {}
      this.ws = null;
    }
  }
}
