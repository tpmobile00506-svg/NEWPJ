import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { settings } from '../config/env';

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.databaseUrl }) });
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
