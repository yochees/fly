import { env } from '../env.ts';

/** Attachments live in R2, keyed by email id and file name. */
export async function put(key: string, data: ArrayBuffer | Uint8Array | string, contentType?: string): Promise<string> {
  await env().FILES.put(key, data as ArrayBuffer, contentType ? { httpMetadata: { contentType } } : undefined);
  return key;
}

export async function get(key: string): Promise<ArrayBuffer | null> {
  const object = await env().FILES.get(key);
  return object ? object.arrayBuffer() : null;
}

export const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
