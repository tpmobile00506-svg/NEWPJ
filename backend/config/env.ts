import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const origin = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
let parsedOrigin = 'http://localhost:3000';
try {
  parsedOrigin = new URL(origin).origin;
} catch {
  parsedOrigin = 'http://localhost:3000';
}

export const settings = {
  databaseUrl: process.env.DATABASE_URL || '',
  port: Number(process.env.BACKEND_PORT || 3000),
  host: process.env.BACKEND_HOST || '127.0.0.1',
  frontendOrigin: parsedOrigin,
  storageDir: resolve(process.cwd(), process.env.STORAGE_DIR || 'backend/storage'),
  secureCookies: process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
};
