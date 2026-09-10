import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { settings } from '../config/env';
import { ApiError } from '../services/errors';

function location(key: string) {
  if (!/^imports\/[a-zA-Z0-9-]+(?:\.json)?$/.test(key)) throw new ApiError('ไม่พบไฟล์', 404);
  return join(settings.storageDir, key);
}
export async function putFile(key: string, body: Uint8Array | string) {
  const file = location(key), temp = file + '.' + randomUUID() + '.tmp';
  await mkdir(join(settings.storageDir, 'imports'), { recursive: true });
  try { await writeFile(temp, body, { flag: 'wx', mode: 0o600 }); await rename(temp, file); }
  finally { await rm(temp, { force: true }); }
}
export async function readFileBytes(key: string) {
  try { return await readFile(location(key)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ApiError('ไม่พบไฟล์ต้นฉบับ', 404);
    throw error;
  }
}
export async function removeUncommittedFile(key: string) { await rm(location(key), { force: true }); }
