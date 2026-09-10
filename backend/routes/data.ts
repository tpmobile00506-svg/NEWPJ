import { member } from '@/backend/auth/sessions';
import { getData, upload, ApiError } from '@/backend/services/asset-service';
import { mutate } from '@/backend/services/asset-mutations';

export const dynamic = 'force-dynamic';

function fail(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  if (/UNIQUE|CHECK constraint/.test(msg)) return Response.json({ error: 'ข้อมูลซ้ำ หรือมีผู้อื่นแก้ไขแล้ว กรุณาโหลดข้อมูลใหม่และตรวจสอบอีกครั้ง' }, { status: 409 });
  return Response.json({ error: 'บันทึกไม่สำเร็จ ระบบยังเก็บข้อมูลที่กรอกไว้ กรุณาลองใหม่' }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    return Response.json(await getData(await member(request), new URL(request.url)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new ApiError('ต้นทางคำขอไม่ถูกต้อง', 403);
    const m = await member(request);
    const data = request.headers.get('content-type')?.includes('multipart/form-data')
      ? await upload(m, await request.formData())
      : await mutate(m, await request.json());
    return Response.json(data);
  } catch (e) {
    return fail(e);
  }
}


