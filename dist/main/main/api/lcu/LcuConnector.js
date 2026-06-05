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
exports.LcuConnector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const execAsync = util_1.default.promisify(child_process_1.exec);
class LcuConnector extends events_1.EventEmitter {
    defaultPath = 'C:\\Riot Games\\League of Legends';
    lockfilePath = null;
    pollInterval = null;
    ws = null;
    credentials = null;
    isConnected = false;
    isSearchingPath = false;
    constructor(customPath) {
        super();
        if (customPath) {
            this.lockfilePath = path.join(customPath, 'lockfile');
        }
    }
    /**
     * Starts polling for the League Client lockfile
     */
    start() {
        if (this.pollInterval)
            return;
        // Check every 2 seconds
        this.pollInterval = setInterval(() => {
            this.checkLockfile();
        }, 2000);
        // Check immediately
        this.checkLockfile();
    }
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.handleDisconnect();
    }
    async checkLockfile() {
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
            }
            catch (err) {
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
                }
                catch (err) {
                    console.error('[LCU] Error reading lockfile:', err);
                }
            }
            else {
                // Only log once to avoid spamming
                // console.log(`[LCU] Waiting for lockfile at ${this.lockfilePath}`);
            }
        }
    }
    connectWebSocket() {
        if (!this.credentials)
            return;
        const url = `wss://127.0.0.1:${this.credentials.port}/`;
        const auth = Buffer.from(`riot:${this.credentials.password}`).toString('base64');
        console.log(`[LCU] Connecting to WebSocket at ${url}`);
        this.ws = new ws_1.default(url, 'wamp', {
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
        this.ws.on('message', (data) => {
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
            }
            catch (e) {
                // Ignore parse errors
            }
        });
        this.ws.on('close', () => {
            this.handleDisconnect();
        });
        this.ws.on('error', (err) => {
            // ECONNREFUSED is expected while the client is still booting — the
            // lockfile exists but the WS port isn't accepting connections yet.
            // Stay quiet and let the next poll retry.
            if (err.code !== 'ECONNREFUSED') {
                console.error('[LCU] WebSocket error:', err.message);
            }
            this.handleDisconnect();
        });
    }
    handleDisconnect() {
        if (this.isConnected) {
            this.isConnected = false;
            this.credentials = null;
            this.emit('disconnect');
        }
        if (this.ws) {
            try {
                this.ws.terminate();
            }
            catch (e) { }
            this.ws = null;
        }
    }
}
exports.LcuConnector = LcuConnector;
