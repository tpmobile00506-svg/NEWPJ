import { login } from '@/backend/auth/sessions';
import { ApiError } from '@/backend/services/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    return await login(request);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: err.status >= 500 ? 400 : err.status });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Login error:', msg);
    return Response.json({ error: msg || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 400 });
  }
}

