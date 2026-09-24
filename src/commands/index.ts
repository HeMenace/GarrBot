import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import type { HandlerResult } from '../discord-response.js';
import type { Env } from '../env.js';
import { KART_COMMAND, PING_COMMAND, SMASH_COMMAND, TIERS_COMMAND, TRACKS_COMMAND, WOTD_COMMAND } from './definitions.js';
import { handleKart } from './kart.js';
import { handlePing } from './ping.js';
import { handleSmash } from './smash.js';
import { handleTiers } from './tiers.js';
import { handleTracks } from './tracks.js';
import { handleWotd } from './wotd.js';

export type CommandHandler = (interaction: APIChatInputApplicationCommandInteraction, env: Env) => Promise<HandlerResult>;

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  [PING_COMMAND.name]: handlePing,
  [SMASH_COMMAND.name]: handleSmash,
  [KART_COMMAND.name]: handleKart,
  [TRACKS_COMMAND.name]: handleTracks,
  [TIERS_COMMAND.name]: handleTiers,
  [WOTD_COMMAND.name]: handleWotd,
};
