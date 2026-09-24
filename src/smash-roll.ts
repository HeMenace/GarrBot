import { FIGHTERS, type Fighter } from './data/smash.js';

export interface SmashOptions {
  count: number;
  allowDuplicates: boolean;
  excludeEchoes: boolean;
  excludeMiis: boolean;
}

export const DEFAULT_SMASH_OPTIONS: SmashOptions = {
  count: 3,
  allowDuplicates: false,
  excludeEchoes: false,
  excludeMiis: false,
};

export interface SmashRollResult {
  fighters: Fighter[];
  requested: number;
  available: number;
}

export function rollFighters(options: SmashOptions): SmashRollResult {
  let pool = FIGHTERS;
  if (options.excludeEchoes) pool = pool.filter((f) => !f.isEcho);
  if (options.excludeMiis) pool = pool.filter((f) => !f.isMii);

  if (options.allowDuplicates) {
    const fighters = Array.from({ length: options.count }, () => pool[Math.floor(Math.random() * pool.length)]);
    return { fighters, requested: options.count, available: pool.length };
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.min(options.count, pool.length);
  return { fighters: shuffled.slice(0, count), requested: options.count, available: pool.length };
}
