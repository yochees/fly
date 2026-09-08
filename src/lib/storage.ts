import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { config } from '../config.ts';

const root = resolve(config.storageDir);

/** Files are kept per email, so the admin page can show what arrived. */
export async function put(key: string, data: Buffer | string): Promise<string> {
  const path = join(root, key);
  if (!path.startsWith(root)) throw new Error('storage key escapes root');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  return key;
}

export async function get(key: string): Promise<Buffer> {
  const path = join(root, key);
  if (!path.startsWith(root)) throw new Error('storage key escapes root');
  return readFile(path);
}

export const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
