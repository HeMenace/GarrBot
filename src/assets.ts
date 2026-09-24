import type { Env } from './env.js';

export async function fetchAsset(env: Env, path: string): Promise<Uint8Array | null> {
  const res = await env.ASSETS.fetch(new URL(path, 'https://assets.internal'));
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}
