import { logout } from '@/backend/auth/sessions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    return await logout(request);
  } catch (err: unknown) {
    console.error('Logout error:', err);
    return Response.json({ ok: true });
  }
}

