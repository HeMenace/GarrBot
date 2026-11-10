import type { APIEmbed } from 'discord-api-types/v10';
import { WOTD_WORDS, type WotdWord } from './data/wotd-words.js';
import { getUsedWords } from './db/wotd.js';
import type { Env } from './env.js';

const EMBED_COLOR = 0x5865f2;

// The image itself already shows the word in big text, so a title would just
// repeat it. Discord always renders an embed's description above its image,
// so to get the definition *below* the image we use a second, image-less
// embed right after the first — stacked embeds render top to bottom.
export function buildWotdEmbeds(word: WotdWord): APIEmbed[] {
  const embeds: APIEmbed[] = [{ color: EMBED_COLOR, image: { url: `attachment://${word.slug}.jpg` } }];
  if (word.definition) {
    embeds.push({ color: EMBED_COLOR, description: word.definition });
  }
  return embeds;
}

const DENVER_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' });

// Denver's calendar date (DST-aware), not UTC — the cron is scheduled around
// a Denver morning, and UTC is 6-7 hours ahead, so using raw UTC would let an
// evening interaction (6 PM+ MDT) silently claim the next day's slot early.
export function todayDateString(): string {
  return DENVER_DATE_FORMATTER.format(new Date());
}

// Picks randomly from words not yet posted. Once every word has been used at
// least once, the pool resets to the full list (per spec: "start over").
export async function pickNextWord(env: Env): Promise<WotdWord> {
  const used = await getUsedWords(env);
  let pool = WOTD_WORDS.filter((w) => !used.has(w.word));
  if (pool.length === 0) pool = WOTD_WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
