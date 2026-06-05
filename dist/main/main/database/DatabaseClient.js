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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseClient = void 0;
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Promise-based singleton: assigned synchronously so parallel callers
// share one in-flight construction instead of each building a new client.
let prismaPromise = null;
class DatabaseClient {
    static getInstance() {
        if (!prismaPromise) {
            prismaPromise = DatabaseClient.create();
        }
        return prismaPromise;
    }
    static async create() {
        const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
        let dbPath;
        if (isDev) {
            // Dev: use the project-root dev.db that `prisma migrate` writes to,
            // so migrations and the running app share the same database.
            dbPath = path.join(electron_1.app.getAppPath(), 'dev.db');
        }
        else {
            // Prod: copy the bundled DB into userData (writable) on first launch.
            const userDataPath = electron_1.app.getPath('userData');
            dbPath = path.join(userDataPath, 'database.sqlite');
            if (!fs.existsSync(dbPath)) {
                const sourceDb = path.join(process.resourcesPath, 'prisma', 'dev.db');
                if (fs.existsSync(sourceDb)) {
                    fs.copyFileSync(sourceDb, dbPath);
                    console.log('[DB] Copied bundled database to userData.');
                }
                else {
                    console.error('[DB] Bundled dev.db not found at', sourceDb);
                }
            }
        }
        // libsql expects forward slashes in file: URLs, even on Windows.
        const url = `file:${dbPath.replace(/\\/g, '/')}`;
        console.log('[DB] Connecting to database at', dbPath);
        // Prisma 7 requires a driver adapter. libsql ships ABI-stable N-API
        // prebuilds, so it loads under Electron without a native rebuild.
        const adapter = new adapter_libsql_1.PrismaLibSql({ url });
        const client = new client_1.PrismaClient({ adapter });
        try {
            await client.$connect();
            console.log('[DB] Database connected successfully.');
        }
        catch (e) {
            console.error('[DB] Database connection error:', e);
            throw e;
        }
        return client;
    }
    static async close() {
        if (prismaPromise) {
            const client = await prismaPromise;
            await client.$disconnect();
            prismaPromise = null;
        }
    }
}
exports.DatabaseClient = DatabaseClient;
