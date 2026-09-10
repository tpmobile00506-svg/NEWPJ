import { randomBytes, randomUUID, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma, type Transaction } from '../db/client';
import { settings } from '../config/env';
import { ApiError } from '../services/errors';
import type { Role } from '../../shared/domain';

const scrypt = promisify(derive), COOKIE = 'ksu_session';
const duration = 8 * 60 * 60;
export const publicUserFields = { id: true, email: true, name: true, role: true, active: true, createdAt: true } as const;
export type Member = { id: string; email: string; name: string; role: Role; active: number; createdAt: string };
export function passwordValid(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new ApiError('รหัสผ่านต้องมีความยาว 8–128 ตัวอักษร');
  }
}
export async function hashPassword(password: string) {
  passwordValid(password);
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password: string, hash: string) {
  const parts = hash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const key = await scrypt(password, parts[1], 64) as Buffer;
  return timingSafeEqual(Buffer.from(parts[2], 'hex'), key);
}
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const dummyHash = hashPassword('dummy-password-hash');
export function cookieValue(request: Request): string | null {
  const value = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function sessionCookie(token: string, maxAge = duration) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${settings.secureCookies || settings.frontendOrigin.startsWith('https:') ? '; Secure' : ''}`;
}
export async function member(request: Request): Promise<Member> {
  const token = cookieValue(request);
  if (!token) throw new ApiError('กรุณาเข้าสู่ระบบ', 401);
  const session = await prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { select: publicUserFields } } });
  if (!session || session.expiresAt <= new Date()) throw new ApiError('กรุณาเข้าสู่ระบบอีกครั้ง', 401);
  if (!session.user.active) throw new ApiError('บัญชีนี้ถูกระงับสิทธิ์ กรุณาติดต่อ Admin', 403);
  return session.user as Member;
}
export async function freshMember(tx: Transaction, member: Member): Promise<Member> {
  const user = await tx.user.findUnique({ where: { id: member.id }, select: publicUserFields });
  if (!user?.active) throw new ApiError('บัญชีนี้ถูกระงับสิทธิ์', 403);
  return user as Member;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const currentOrigin = host ? `${proto}://${host}` : new URL(request.url).origin;
  if (
    origin === currentOrigin ||
    origin === settings.frontendOrigin ||
    origin === new URL(request.url).origin ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return;
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError('ต้นทางคำขอไม่ถูกต้อง', 403);
  }
}
export async function login(request: Request) {
  checkOrigin(request);
  const data = await request.json() as { email?: unknown; password?: unknown };
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  if (email.length > 200 || password.length > 128) throw new ApiError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);

  // Auto-bootstrap initial admin if database is fresh and has no users
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0 && email) {
      const passwordHash = await hashPassword(password.length >= 8 ? password : 'admin12345678');
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          name: 'ผู้ดูแลระบบ (Admin)',
          role: 'admin',
          active: 1,
          passwordHash,
          createdAt: new Date().toISOString(),
        }
      });
    }
  } catch (err) {
    console.error('Database connection/bootstrap check error:', err);
  }

  let user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user?.active || !valid) throw new ApiError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
  const token = randomBytes(32).toString('hex');
  await prisma.$transaction(async tx => {
    // Prevent a concurrent password reset/deactivation from issuing a fresh session.
    const current = await tx.user.findUnique({ where: { id: user!.id } });
    if (!current?.active || current.passwordHash !== user!.passwordHash) throw new ApiError('กรุณาเข้าสู่ระบบอีกครั้ง', 401);
    await tx.session.create({ data: { tokenHash: digest(token), userId: user!.id, expiresAt: new Date(Date.now() + duration * 1000) } });
  }, { isolationLevel: 'Serializable' });
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
export async function logout(request: Request) {
  checkOrigin(request);
  const token = cookieValue(request);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0), 'Cache-Control': 'no-store' } });
}
