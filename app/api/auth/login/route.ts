import { login } from '@/backend/auth/sessions';
import { ApiError } from '@/backend/services/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    return await login(request);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    const status = (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') ? err.status : 500;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Login error:', msg);
    return Response.json({ error: msg || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status });
  }
}

