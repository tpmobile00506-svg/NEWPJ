import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { settings } from '../config/env';
import { ensureDatabaseReady } from './init';

const connectionString = settings.databaseUrl || process.env.DATABASE_URL || '';
const isRemote = connectionString.includes('neon.tech') ||
                 connectionString.includes('sslmode=require') ||
                 connectionString.includes('supabase') ||
                 process.env.NODE_ENV === 'production';

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

export const pool = globalForDb.pgPool ?? new pg.Pool({
  connectionString: connectionString || undefined,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 8000,
});

export async function checkDatabase() {
  if (!connectionString) {
    throw new Error('ยังไม่ได้กำหนด DATABASE_URL ใน Environment Variables บน Vercel กรุณาตรวจสอบการตั้งค่า');
  }
  await ensureDatabaseReady(pool);
}

function getPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForDb.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = prisma;
  globalForDb.pgPool = pool;
}

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
