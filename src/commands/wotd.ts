import { InteractionResponseType, type APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { fetchAsset } from '../assets.js';
import { WOTD_WORDS } from '../data/wotd-words.js';
import { getEntryForDate } from '../db/wotd.js';
import type { HandlerResult } from '../discord-response.js';
import { getInteractionUserId, isAdmin } from '../discord.js';
import type { Env } from '../env.js';
import { getWordsFile, updateWordsFile } from '../github.js';
import { getOption } from '../options.js';
import { slugify } from '../slugify.js';
import { todayDateString } from '../wotd.js';
import { runWotdPost } from '../wotd-post.js';

const EPHEMERAL = 64;

function ephemeral(content: string): HandlerResult {
  return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: { content, flags: EPHEMERAL } } };
}

async function handleForcePost(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  if (!isAdmin(env, getInteractionUserId(interaction))) {
    return ephemeral('You do not have permission to force a post.');
  }
  try {
    const result = await runWotdPost(env, { force: true });
    return ephemeral(`Posted **${result.word}** to <#${env.WOTD_CHANNEL_ID}>.`);
  } catch (err) {
    console.error('WOTD force post failed:', err);
    return ephemeral(`Failed to post: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleAddWords(interaction: APIChatInputApplicationCommandInteraction, env: Env, raw: string): Promise<HandlerResult> {
  if (!isAdmin(env, getInteractionUserId(interaction))) {
    return ephemeral('You do not have permission to add words.');
  }

  const requested = [...new Set(raw.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean))];
  if (requested.length === 0) {
    return ephemeral('No words given.');
  }

  try {
    const file = await getWordsFile(env);
    const existingLines = file.content.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
    const existingSlugs = new Set(existingLines.map((w) => slugify(w)));

    const added: string[] = [];
    const skipped: string[] = [];
    for (const word of requested) {
      const slug = slugify(word);
      if (existingSlugs.has(slug)) {
        skipped.push(word);
        continue;
      }
      existingSlugs.add(slug);
      added.push(word);
    }

    if (added.length === 0) {
      return ephemeral(`Already in the list: ${skipped.join(', ')}`);
    }

    const newContent = [...existingLines, ...added].join('\n') + '\n';
    const who = getInteractionUserId(interaction);
    await updateWordsFile(env, newContent, file.sha, `Add word(s) via /wotd add: ${added.join(', ')} (requested by ${who})`);

    const skippedNote = skipped.length > 0 ? ` (already had: ${skipped.join(', ')})` : '';
    return ephemeral(`Added **${added.join('**, **')}**${skippedNote}. Deploy will pick it up in a minute or two.`);
  } catch (err) {
    console.error('WOTD add words failed:', err);
    return ephemeral(`Failed to add words: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleView(env: Env): Promise<HandlerResult> {
  const entry = await getEntryForDate(env, todayDateString());
  if (!entry) {
    return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: { content: "Today's word hasn't posted yet." } } };
  }

  const wordEntry = WOTD_WORDS.find((w) => w.word === entry.word);
  if (!wordEntry) return ephemeral("Today's word is no longer in the word list.");

  const bytes = await fetchAsset(env, `/wotd/${wordEntry.slug}.png`);
  if (!bytes) return ephemeral("Today's image is missing. Run npm run render-wotd.");

  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { embeds: [{ title: entry.word, color: 0x5865f2, image: { url: `attachment://${wordEntry.slug}.png` } }] },
    },
    files: [{ filename: `${wordEntry.slug}.png`, data: bytes }],
  };
}

export async function handleWotd(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  const addWords = getOption<string>(interaction.data.options, 'add');
  if (addWords) return handleAddWords(interaction, env, addWords);

  const forcePost = getOption<boolean>(interaction.data.options, 'post') ?? false;
  if (forcePost) return handleForcePost(interaction, env);

  return handleView(env);
}
