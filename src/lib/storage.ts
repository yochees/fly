import { env } from '../env.ts';

/**
 * Attachments live in R2 when the bucket is bound. Without it nothing is kept
 * and the pipeline downloads from OpenMail each time, which costs one request
 * and loses only our own archive copy.
 */
export const enabled = () => Boolean(env().FILES);

export async function put(key: string, data: ArrayBuffer | Uint8Array | string, contentType?: string): Promise<string | null> {
  const bucket = env().FILES;
  if (!bucket) return null;
  await bucket.put(key, data as ArrayBuffer, contentType ? { httpMetadata: { contentType } } : undefined);
  return key;
}

export async function get(key: string): Promise<ArrayBuffer | null> {
  const bucket = env().FILES;
  if (!bucket) return null;
  const object = await bucket.get(key);
  return object ? object.arrayBuffer() : null;
}

export const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
