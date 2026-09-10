import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { settings } from '../config/env';
import { ensureDatabaseReady } from './init';

import { ApiError } from '../services/errors';

export function getDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL || settings.databaseUrl || '').trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
  currentUrl?: string;
};

export function getPool(): pg.Pool {
  const url = getDatabaseUrl();
  if (globalForDb.pgPool && globalForDb.currentUrl === url) {
    return globalForDb.pgPool;
  }
  const isRemote = url.includes('neon.tech') ||
                   url.includes('sslmode=require') ||
                   url.includes('supabase') ||
                   url.includes('aws') ||
                   (!url.includes('localhost') && !url.includes('127.0.0.1') && url.length > 0);

  const pool = new pg.Pool({
    connectionString: url || undefined,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  globalForDb.pgPool = pool;
  globalForDb.currentUrl = url;
  globalForDb.prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return pool;
}

export const pool = getPool();

export async function checkDatabase() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new ApiError('ยังไม่ได้กำหนด DATABASE_URL ใน Environment Variables บน Vercel กรุณานำ Connection String จาก Neon มาใส่', 400);
  }
  if ((url.includes('localhost') || url.includes('127.0.0.1')) && process.env.VERCEL) {
    throw new ApiError('DATABASE_URL บน Vercel เป็น localhost ซึ่งเซิร์ฟเวอร์ Cloud ไม่สามารถต่อได้ กรุณานำ Connection String จาก Neon มาใส่', 400);
  }
  try {
    const p = getPool();
    await ensureDatabaseReady(p);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Database connection error:', msg);
    throw new ApiError(`ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ${msg}`, 400);
  }
}

function getPrismaClient(): PrismaClient {
  getPool();
  return globalForDb.prisma!;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

export type Transaction = Prisma.TransactionClient;
export { Prisma };

// The API contract uses safe integer satang; PostgreSQL stores them in BIGINT.
export function json(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (typeof item !== 'bigint') return item;
    const n = Number(item);
    if (!Number.isSafeInteger(n)) throw new Error('Database value exceeds the API safe integer range');
    return n;
  });
}
export function plain<T>(value: unknown): T { return JSON.parse(json(value)) as T; }
