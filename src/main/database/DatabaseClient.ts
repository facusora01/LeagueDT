import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Promise-based singleton: assigned synchronously so parallel callers
// share one in-flight construction instead of each building a new client.
let prismaPromise: Promise<PrismaClient> | null = null;

export class DatabaseClient {
  static getInstance(): Promise<PrismaClient> {
    if (!prismaPromise) {
      prismaPromise = DatabaseClient.create();
    }
    return prismaPromise;
  }

  private static async create(): Promise<PrismaClient> {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    let dbPath: string;

    if (isDev) {
      // Dev: use the project-root dev.db that `prisma migrate` writes to,
      // so migrations and the running app share the same database.
      dbPath = path.join(app.getAppPath(), 'dev.db');
    } else {
      // Prod: copy the bundled DB into userData (writable) on first launch.
      const userDataPath = app.getPath('userData');
      dbPath = path.join(userDataPath, 'database.sqlite');

      if (!fs.existsSync(dbPath)) {
        const sourceDb = path.join(process.resourcesPath, 'prisma', 'dev.db');
        if (fs.existsSync(sourceDb)) {
          fs.copyFileSync(sourceDb, dbPath);
          console.log('[DB] Copied bundled database to userData.');
        } else {
          console.error('[DB] Bundled dev.db not found at', sourceDb);
        }
      }
    }

    // libsql expects forward slashes in file: URLs, even on Windows.
    const url = `file:${dbPath.replace(/\\/g, '/')}`;
    console.log('[DB] Connecting to database at', dbPath);

    // Prisma 7 requires a driver adapter. libsql ships ABI-stable N-API
    // prebuilds, so it loads under Electron without a native rebuild.
    const adapter = new PrismaLibSql({ url });
    const client = new PrismaClient({ adapter });

    try {
      await client.$connect();
      console.log('[DB] Database connected successfully.');
    } catch (e) {
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
