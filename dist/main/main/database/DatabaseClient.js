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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let prisma = null;
class DatabaseClient {
    static async getInstance() {
        if (prisma)
            return prisma;
        const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
        // In production, the appPath is where the ASAR bundle is.
        // userData is where we have write access.
        const userDataPath = electron_1.app.getPath('userData');
        const dbPath = path.join(userDataPath, 'database.sqlite');
        if (!fs.existsSync(dbPath)) {
            console.log('[DB] No database found in userData. Copying default dev.db...');
            const sourceDb = isDev
                ? path.join(electron_1.app.getAppPath(), 'prisma', 'dev.db')
                : path.join(process.resourcesPath, 'prisma', 'dev.db');
            if (fs.existsSync(sourceDb)) {
                fs.copyFileSync(sourceDb, dbPath);
                console.log('[DB] Database copied successfully.');
            }
            else {
                console.error('[DB] Default dev.db not found at', sourceDb);
            }
        }
        console.log('[DB] Connecting to database at', dbPath);
        // Override the datasource URL via environment variable for Prisma
        process.env.DATABASE_URL = `file:${dbPath}`;
        prisma = new client_1.PrismaClient();
        try {
            await prisma.$connect();
            console.log('[DB] Database connected successfully.');
        }
        catch (e) {
            console.error('[DB] Database connection error:', e);
        }
        return prisma;
    }
    static async close() {
        if (prisma) {
            await prisma.$disconnect();
            prisma = null;
        }
    }
}
exports.DatabaseClient = DatabaseClient;
