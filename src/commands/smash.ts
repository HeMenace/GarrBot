import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { fetchAsset } from '../assets.js';
import type { AttachmentFile, HandlerResult } from '../discord-response.js';
import type { Env } from '../env.js';
import { getOption } from '../options.js';
import { DEFAULT_SMASH_OPTIONS, rollFighters, type SmashOptions } from '../smash-roll.js';

const CUSTOM_ID_PREFIX = 'smash_reroll';

function encodeCustomId(options: SmashOptions): string {
  return [CUSTOM_ID_PREFIX, options.count, options.allowDuplicates ? 1 : 0, options.excludeEchoes ? 1 : 0, options.excludeMiis ? 1 : 0].join(
    ':',
  );
}

function decodeCustomId(customId: string): SmashOptions {
  const [, count, dup, noEcho, noMii] = customId.split(':');
  return {
    count: Number(count) || DEFAULT_SMASH_OPTIONS.count,
    allowDuplicates: dup === '1',
    excludeEchoes: noEcho === '1',
    excludeMiis: noMii === '1',
  };
}

async function buildSmashResponse(env: Env, options: SmashOptions): Promise<HandlerResult> {
  const { fighters, requested, available } = rollFighters(options);

  // Fetch each unique fighter's image once, even if allow_duplicates rolled the same fighter twice.
  const uniqueIds = [...new Set(fighters.map((f) => f.id))];
  const imagesById = new Map(
    await Promise.all(uniqueIds.map(async (id) => [id, await fetchAsset(env, `/smash/${id}.png`)] as const)),
  );

  const embeds: APIEmbed[] = fighters.map((fighter) => {
    const tags = [fighter.isEcho ? 'Echo' : null, fighter.isMii ? 'Mii' : null].filter(Boolean).join(' · ');
    const hasImage = imagesById.get(fighter.id) != null;
    return {
      title: fighter.name,
      description: `Fighter #${fighter.number}${tags ? ` · ${tags}` : ''}`,
      color: 0x5865f2,
      ...(hasImage ? { thumbnail: { url: `attachment://${fighter.id}.png` } } : {}),
    };
  });

  const files: AttachmentFile[] = uniqueIds
    .filter((id) => imagesById.get(id) != null)
    .map((id) => ({ filename: `${id}.png`, data: imagesById.get(id)! }));

  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        ...(requested > available
          ? { content: `Only ${available} fighters matched your filters — showing all of them.` }
          : {}),
        embeds,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                label: 'Reroll',
                custom_id: encodeCustomId(options),
              },
            ],
          },
        ],
      },
    },
    files,
  };
}

export async function handleSmash(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  const options = interaction.data.options;
  const smashOptions: SmashOptions = {
    count: getOption<number>(options, 'count') ?? DEFAULT_SMASH_OPTIONS.count,
    allowDuplicates: getOption<boolean>(options, 'allow_duplicates') ?? DEFAULT_SMASH_OPTIONS.allowDuplicates,
    excludeEchoes: getOption<boolean>(options, 'exclude_echoes') ?? DEFAULT_SMASH_OPTIONS.excludeEchoes,
    excludeMiis: getOption<boolean>(options, 'exclude_miis') ?? DEFAULT_SMASH_OPTIONS.excludeMiis,
  };

  return buildSmashResponse(env, smashOptions);
}

export async function handleSmashReroll(interaction: APIMessageComponentInteraction, env: Env): Promise<HandlerResult> {
  const options = decodeCustomId(interaction.data.custom_id);
  return buildSmashResponse(env, options);
}
