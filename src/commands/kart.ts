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
import { rollKart } from '../mk8-roll.js';

const CUSTOM_ID = 'kart_reroll';

interface KartPart {
  folder: 'characters' | 'bodies' | 'tires' | 'gliders';
  id: string;
  label: string;
  name: string;
}

async function buildKartResponse(env: Env): Promise<HandlerResult> {
  const roll = rollKart();

  const parts: KartPart[] = [
    { folder: 'characters', id: roll.driver.id, label: 'Character', name: roll.driver.name },
    { folder: 'bodies', id: roll.body.id, label: 'Body', name: roll.body.name },
    { folder: 'tires', id: roll.tire.id, label: 'Tires', name: roll.tire.name },
    { folder: 'gliders', id: roll.glider.id, label: 'Glider', name: roll.glider.name },
  ];

  const images = await Promise.all(parts.map((part) => fetchAsset(env, `/mk8/${part.folder}/${part.id}.png`)));

  const embeds: APIEmbed[] = parts.map((part, i) => ({
    title: part.name,
    description: part.label,
    color: 0x5865f2,
    ...(images[i] ? { thumbnail: { url: `attachment://${part.folder}-${part.id}.png` } } : {}),
  }));

  const files: AttachmentFile[] = parts
    .map((part, i) => (images[i] ? { filename: `${part.folder}-${part.id}.png`, data: images[i]! } : null))
    .filter((file): file is AttachmentFile => file !== null);

  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [{ type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Reroll', custom_id: CUSTOM_ID }],
          },
        ],
      },
    },
    files,
  };
}

export async function handleKart(_interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  return buildKartResponse(env);
}

export async function handleKartReroll(_interaction: APIMessageComponentInteraction, env: Env): Promise<HandlerResult> {
  return buildKartResponse(env);
}
