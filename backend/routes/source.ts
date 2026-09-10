import { member } from '@/backend/auth/sessions';
import { ApiError } from '@/backend/services/errors';
import { readFileBytes } from '@/backend/storage/files';
import { prisma } from '@/backend/db/client';
import original from '@/data/provided-original.json';

export async function GET(request: Request) {
  try {
    await member(request);
    const s = new URL(request.url).searchParams.get('source');
    let body: BodyInit, name: string;
    if (s === 'provided-2569') {
      body = Uint8Array.from(atob(original.base64), c => c.charCodeAt(0));
      name = 'original-assets-2569.xlsx';
    } else {
      const f = await prisma.importFile.findUnique({ where: { id: s || '' } });
      if (!f) throw new ApiError('ไม่พบไฟล์', 404);
      body = (await readFileBytes(f.objectKey)) as unknown as BodyInit;
      name = f.name;
    }
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name),
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'ไม่พบไฟล์' }, { status: e instanceof ApiError ? e.status : 500 });
  }
}


