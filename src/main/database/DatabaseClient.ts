import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let prisma: PrismaClient | null = null;

export class DatabaseClient {
  public static async getInstance(): Promise<PrismaClient> {
    if (prisma) return prisma;

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    // In production, the appPath is where the ASAR bundle is.
    // userData is where we have write access.
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.log('[DB] No database found in userData. Copying default dev.db...');
      const sourceDb = isDev 
        ? path.join(app.getAppPath(), 'prisma', 'dev.db')
        : path.join(process.resourcesPath, 'prisma', 'dev.db');
        
      if (fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, dbPath);
        console.log('[DB] Database copied successfully.');
      } else {
        console.error('[DB] Default dev.db not found at', sourceDb);
      }
    }

    console.log('[DB] Connecting to database at', dbPath);

    // Override the datasource URL via environment variable for Prisma
    process.env.DATABASE_URL = `file:${dbPath}`;

    prisma = new PrismaClient();

    try {
      await prisma.$connect();
      console.log('[DB] Database connected successfully.');
    } catch (e) {
      console.error('[DB] Database connection error:', e);
    }

    return prisma;
  }

  public static async close() {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
  }
}
