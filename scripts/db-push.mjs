import { execSync } from 'node:child_process';

if (process.env.DATABASE_URL) {
  try {
    console.log('DATABASE_URL detected. Synchronizing Prisma schema to database...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database schema synchronized successfully.');
  } catch (e) {
    console.warn('Database schema push warning (non-fatal):', e?.message || e);
  }
} else {
  console.log('No DATABASE_URL provided during build, skipping automatic db push.');
}
