"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LcuDraftDetector = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const CHAMP_SELECT_URI = '/lol/champ-select/v1/session';
const POLL_INTERVAL_MS = 3000;
class LcuDraftDetector {
    lcu;
    session;
    pollTimer = null;
    httpsAgent = new https_1.default.Agent({ rejectUnauthorized: false });
    constructor(lcu, session) {
        this.lcu = lcu;
        this.session = session;
        this.lcu.on('connect', () => this.start());
        this.lcu.on('disconnect', () => this.stop());
        // Also subscribe to WebSocket push events for immediate updates
        this.lcu.on(`OnJsonApiEvent${CHAMP_SELECT_URI}`, (event) => {
            this.session.updateFromLcu(event?.data ?? null);
        });
    }
    start() {
        if (this.pollTimer)
            return;
        this.pollOnce();
        this.pollTimer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
        console.log('[DraftDetector] Polling started');
    }
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.session.reset();
        console.log('[DraftDetector] Polling stopped');
    }
    async pollOnce() {
        const creds = this.lcu.credentials;
        if (!creds)
            return;
        try {
            const data = await this.fetchSession(creds);
            this.session.updateFromLcu(data);
        }
        catch (err) {
            if (err?.response?.status === 404) {
                // Not in champ select — reset if was active
                if (this.session.getState().phase !== 'idle') {
                    this.session.reset();
                }
            }
            else {
                console.error('[DraftDetector] Poll error:', err?.message);
            }
        }
    }
    async fetchSession(creds) {
        const auth = Buffer.from(`riot:${creds.password}`).toString('base64');
        const url = `${creds.protocol}://127.0.0.1:${creds.port}${CHAMP_SELECT_URI}`;
        const { data } = await axios_1.default.get(url, {
            headers: { Authorization: `Basic ${auth}` },
            httpsAgent: this.httpsAgent,
        });
        return data;
    }
}
exports.LcuDraftDetector = LcuDraftDetector;
