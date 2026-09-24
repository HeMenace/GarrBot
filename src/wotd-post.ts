import { fetchAsset } from './assets.js';
import { WOTD_WORDS } from './data/wotd-words.js';
import { getEntryForDate, tryClaimDate, type WotdEntry } from './db/wotd.js';
import { postMessageWithAttachment } from './discord.js';
import type { Env } from './env.js';
import { pickNextWord, todayDateString } from './wotd.js';

export interface WotdPostResult {
  posted: boolean;
  alreadyPostedToday: boolean;
  word: string;
}

// The scheduled cron calls this with force=false, so a double-fire on the same
// day is a no-op. /wotd post calls it with force=true to resend for testing —
// still reusing today's already-picked word rather than burning a new one.
export async function runWotdPost(env: Env, { force = false }: { force?: boolean } = {}): Promise<WotdPostResult> {
  const date = todayDateString();
  let entry: WotdEntry | null = await getEntryForDate(env, date);
  const alreadyPostedToday = entry !== null;

  if (!entry) {
    const picked = await pickNextWord(env);
    const postedAt = new Date().toISOString();
    const claimed = await tryClaimDate(env, date, picked.word, postedAt);
    entry = claimed ? { date, word: picked.word, postedAt } : await getEntryForDate(env, date);
  }
  if (!entry) throw new Error('Failed to determine a word for today.');

  if (alreadyPostedToday && !force) {
    return { posted: false, alreadyPostedToday: true, word: entry.word };
  }

  const wordEntry = WOTD_WORDS.find((w) => w.word === entry!.word);
  if (!wordEntry) throw new Error(`Word "${entry.word}" is no longer in the word list.`);

  const bytes = await fetchAsset(env, `/wotd/${wordEntry.slug}.png`);
  if (!bytes) throw new Error(`Missing rendered image for "${entry.word}". Run npm run render-wotd.`);

  await postMessageWithAttachment(env, env.WOTD_CHANNEL_ID, {}, { filename: `${wordEntry.slug}.png`, data: bytes });
  return { posted: true, alreadyPostedToday, word: entry.word };
}
