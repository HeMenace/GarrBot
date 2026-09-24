import type { APIMessageComponentInteraction } from 'discord-api-types/v10';
import { handleKartReroll } from '../commands/kart.js';
import { handleSmashReroll } from '../commands/smash.js';
import { handleTiersVoteNext, handleTiersVoteSelect, VOTE_NEXT_CUSTOM_ID } from '../commands/tiers.js';
import { handleTracksReroll } from '../commands/tracks.js';
import type { HandlerResult } from '../discord-response.js';
import type { Env } from '../env.js';

export type ComponentHandler = (interaction: APIMessageComponentInteraction, env: Env) => Promise<HandlerResult>;

export const COMPONENT_HANDLERS: Record<string, ComponentHandler> = {
  smash_reroll: handleSmashReroll,
  kart_reroll: handleKartReroll,
  tracks_reroll: handleTracksReroll,
  tiers_vote_select: handleTiersVoteSelect,
  [VOTE_NEXT_CUSTOM_ID]: handleTiersVoteNext,
};
