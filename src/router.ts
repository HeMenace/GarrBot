import {
  InteractionResponseType,
  InteractionType,
  type APIApplicationCommandAutocompleteInteraction,
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import { AUTOCOMPLETE_HANDLERS } from './autocomplete/index.js';
import { COMMAND_HANDLERS } from './commands/index.js';
import { COMPONENT_HANDLERS } from './components/index.js';
import type { HandlerResult } from './discord-response.js';
import type { Env } from './env.js';

const EPHEMERAL = 64;

export async function handleInteraction(interaction: APIInteraction, env: Env): Promise<HandlerResult> {
  if (interaction.type === InteractionType.Ping) {
    return { response: { type: InteractionResponseType.Pong } };
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    const handler = COMMAND_HANDLERS[interaction.data.name];
    if (!handler) {
      return {
        response: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `Unknown command: ${interaction.data.name}`, flags: EPHEMERAL },
        },
      };
    }
    return handler(interaction as APIChatInputApplicationCommandInteraction, env);
  }

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    const autocompleteInteraction = interaction as APIApplicationCommandAutocompleteInteraction;
    const handler = AUTOCOMPLETE_HANDLERS[autocompleteInteraction.data.name];
    if (!handler) {
      return { response: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } } };
    }
    return { response: await handler(autocompleteInteraction, env) };
  }

  if (interaction.type === InteractionType.MessageComponent) {
    const messageInteraction = interaction as APIMessageComponentInteraction;
    const prefix = messageInteraction.data.custom_id.split(':')[0];
    const handler = COMPONENT_HANDLERS[prefix];
    if (!handler) {
      return {
        response: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Unknown component.', flags: EPHEMERAL },
        },
      };
    }
    return handler(messageInteraction, env);
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    return {
      response: {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'Not implemented yet.', flags: EPHEMERAL },
      },
    };
  }

  return {
    response: {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Unsupported interaction type.', flags: EPHEMERAL },
    },
  };
}
