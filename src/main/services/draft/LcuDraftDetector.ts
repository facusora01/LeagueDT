import axios from 'axios';
import https from 'https';
import type { LcuConnector, LcuCredentials } from '../../api/lcu/LcuConnector';
import type { DraftSession } from './DraftSession';

const CHAMP_SELECT_URI = '/lol/champ-select/v1/session';
const POLL_INTERVAL_MS = 3000;

export class LcuDraftDetector {
  private lcu: LcuConnector;
  private session: DraftSession;
  private pollTimer: NodeJS.Timeout | null = null;
  private httpsAgent = new https.Agent({ rejectUnauthorized: false });

  constructor(lcu: LcuConnector, session: DraftSession) {
    this.lcu = lcu;
    this.session = session;

    this.lcu.on('connect', () => this.start());
    this.lcu.on('disconnect', () => this.stop());

    // Also subscribe to WebSocket push events for immediate updates
    this.lcu.on(`OnJsonApiEvent${CHAMP_SELECT_URI}`, (event: any) => {
      this.session.updateFromLcu(event?.data ?? null);
    });
  }

  private start() {
    if (this.pollTimer) return;
    this.pollOnce();
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
    console.log('[DraftDetector] Polling started');
  }

  private stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.session.reset();
    console.log('[DraftDetector] Polling stopped');
  }

  private async pollOnce() {
    const creds = this.lcu.credentials;
    if (!creds) return;

    try {
      const data = await this.fetchSession(creds);
      this.session.updateFromLcu(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Not in champ select — reset if was active
        if (this.session.getState().phase !== 'idle') {
          this.session.reset();
        }
      } else {
        console.error('[DraftDetector] Poll error:', err?.message);
      }
    }
  }

  private async fetchSession(creds: LcuCredentials) {
    const auth = Buffer.from(`riot:${creds.password}`).toString('base64');
    const url = `${creds.protocol}://127.0.0.1:${creds.port}${CHAMP_SELECT_URI}`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
      httpsAgent: this.httpsAgent,
    });
    return data;
  }
}
