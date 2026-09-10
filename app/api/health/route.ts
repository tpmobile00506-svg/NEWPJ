import { getDatabaseUrl, getPool } from '@/backend/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = getDatabaseUrl();
  let host = 'not set';
  let isNeon = false;
  let isLocal = false;

  if (url) {
    try {
      const parsed = new URL(url);
      host = parsed.host;
      isNeon = host.includes('neon.tech');
      isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    } catch {
      host = 'invalid url format';
    }
  }

  let dbConnected = false;
  let dbError = '';

  if (url && !isLocal) {
    try {
      const pool = getPool();
      await pool.query('SELECT 1');
      dbConnected = true;
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json({
    status: dbConnected ? 'ready' : (url ? 'db_error' : 'missing_database_url'),
    databaseConfigured: !!url,
    databaseHost: host,
    isNeon,
    isLocal,
    dbConnected,
    dbError: dbError || undefined,
    tip: !url
      ? 'กรุณาไปที่ Vercel -> Settings -> Environment Variables แล้วใส่ DATABASE_URL จาก Neon'
      : (isLocal ? 'DATABASE_URL ชี้ไปที่ localhost ซึ่งใช้บน Cloud ไม่ได้ กรุณาใส่ URL จาก Neon' : undefined),
  });
}
