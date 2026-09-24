import { InteractionResponseType, type APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import type { HandlerResult } from '../discord-response.js';
import type { Env } from '../env.js';

export async function handlePing(_interaction: APIChatInputApplicationCommandInteraction, _env: Env): Promise<HandlerResult> {
  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'pong' },
    },
  };
}
