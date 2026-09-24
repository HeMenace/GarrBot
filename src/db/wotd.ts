import type { Env } from '../env.js';

export interface WotdEntry {
  date: string;
  word: string;
  postedAt: string;
}

export async function getUsedWords(env: Env): Promise<Set<string>> {
  const { results } = await env.DB.prepare('SELECT DISTINCT word FROM wotd_history').all<{ word: string }>();
  return new Set(results.map((r) => r.word));
}

export async function getEntryForDate(env: Env, date: string): Promise<WotdEntry | null> {
  const row = await env.DB.prepare('SELECT date, word, posted_at as postedAt FROM wotd_history WHERE date = ?')
    .bind(date)
    .first<WotdEntry>();
  return row ?? null;
}

// Returns true if this call actually claimed the date (i.e. nothing was there yet).
// A double-fire (or a race with /wotd post) will lose this and get false back.
export async function tryClaimDate(env: Env, date: string, word: string, postedAt: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'INSERT INTO wotd_history (date, word, posted_at) VALUES (?, ?, ?) ON CONFLICT(date) DO NOTHING',
  )
    .bind(date, word, postedAt)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
