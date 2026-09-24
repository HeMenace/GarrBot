import { WOTD_WORDS, type WotdWord } from './data/wotd-words.js';
import { getUsedWords } from './db/wotd.js';
import type { Env } from './env.js';

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Picks randomly from words not yet posted. Once every word has been used at
// least once, the pool resets to the full list (per spec: "start over").
export async function pickNextWord(env: Env): Promise<WotdWord> {
  const used = await getUsedWords(env);
  let pool = WOTD_WORDS.filter((w) => !used.has(w.word));
  if (pool.length === 0) pool = WOTD_WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
