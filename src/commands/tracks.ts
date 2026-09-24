import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { getAllTrackTierRows } from '../db/tiers.js';
import { TRACKS } from '../data/mk8-tracks.js';
import type { HandlerResult } from '../discord-response.js';
import type { Env } from '../env.js';
import { getOption } from '../options.js';
import { gradeInRange, parseTierFilter } from '../tier-filter.js';

const CUSTOM_ID_PREFIX = 'tracks_reroll';
const DEFAULT_COUNT = 4;
const EPHEMERAL = 64;

interface TracksOptions {
  count: number;
  cup: string | null;
  tier: string | null;
}

function encodeCustomId(options: TracksOptions): string {
  return [CUSTOM_ID_PREFIX, options.count, options.cup ?? '', options.tier ?? ''].join(':');
}

function decodeCustomId(customId: string): TracksOptions {
  const [, count, cup, tier] = customId.split(':');
  return { count: Number(count) || DEFAULT_COUNT, cup: cup || null, tier: tier || null };
}

async function rollTracks(env: Env, options: TracksOptions) {
  let pool = options.cup ? TRACKS.filter((t) => t.cup === options.cup) : TRACKS;

  if (options.tier) {
    const range = parseTierFilter(options.tier);
    if (!range) return { error: `Couldn't parse tier filter "${options.tier}". Try a letter (C), an exact grade (C+), a range (S-B), or "A- to B+".` };
    const rows = await getAllTrackTierRows(env);
    const matchingIds = new Set(rows.filter((r) => r.effectiveGrade && gradeInRange(r.effectiveGrade, range)).map((r) => r.id));
    pool = pool.filter((t) => matchingIds.has(t.id));
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.min(options.count, pool.length);
  return { tracks: shuffled.slice(0, count), requested: options.count, available: pool.length };
}

async function buildTracksResponse(env: Env, options: TracksOptions): Promise<HandlerResult> {
  const result = await rollTracks(env, options);
  if ('error' in result) {
    return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: { content: result.error, flags: EPHEMERAL } } };
  }

  const { tracks, requested, available } = result;
  const lines = tracks.map((track, i) => `${i + 1}. **${track.name}** — ${track.cup}`);
  const titleParts = [options.cup, options.tier ? `Tier ${options.tier}` : null].filter(Boolean);

  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        ...(requested > available && available > 0
          ? { content: `Only ${available} tracks matched your filter — showing all of them.` }
          : {}),
        embeds: [
          {
            title: titleParts.length > 0 ? `Tracks — ${titleParts.join(', ')}` : 'Tracks',
            description: lines.length > 0 ? lines.join('\n') : 'No tracks matched that filter.',
            color: 0x5865f2,
          },
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Reroll', custom_id: encodeCustomId(options) },
            ],
          },
        ],
      },
    },
  };
}

export async function handleTracks(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  const opts = interaction.data.options;
  const options: TracksOptions = {
    count: getOption<number>(opts, 'count') ?? DEFAULT_COUNT,
    cup: getOption<string>(opts, 'cup') ?? null,
    tier: getOption<string>(opts, 'tier') ?? null,
  };
  return buildTracksResponse(env, options);
}

export async function handleTracksReroll(interaction: APIMessageComponentInteraction, env: Env): Promise<HandlerResult> {
  const options = decodeCustomId(interaction.data.custom_id);
  return buildTracksResponse(env, options);
}
