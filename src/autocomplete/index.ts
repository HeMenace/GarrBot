import {
  InteractionResponseType,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandOptionChoice,
  type APIInteractionResponse,
} from 'discord-api-types/v10';
import { TRACKS } from '../data/mk8-tracks.js';
import type { Env } from '../env.js';
import { TIER_FILTER_EXAMPLES } from '../tier-filter.js';

export type AutocompleteHandler = (
  interaction: APIApplicationCommandAutocompleteInteraction,
  env: Env,
) => Promise<APIInteractionResponse>;

interface FocusedOption {
  name: string;
  value: string;
}

interface OptionLike {
  name: string;
  value?: unknown;
  focused?: boolean;
  options?: OptionLike[];
}

function findFocusedOption(options: OptionLike[] | undefined): FocusedOption | null {
  if (!options) return null;
  for (const option of options) {
    if (option.focused) return { name: option.name, value: String(option.value ?? '') };
    const nested = findFocusedOption(option.options);
    if (nested) return nested;
  }
  return null;
}

function autocompleteResult(choices: APIApplicationCommandOptionChoice[]): APIInteractionResponse {
  return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices } };
}

function autocompleteTier(current: string): APIInteractionResponse {
  const query = current.trim().toUpperCase();
  const matches = TIER_FILTER_EXAMPLES.filter((example) => example.toUpperCase().startsWith(query)).slice(0, 25);
  return autocompleteResult(matches.map((value) => ({ name: value, value })));
}

function autocompleteTrack(current: string): APIInteractionResponse {
  const query = current.trim().toLowerCase();
  const matches = TRACKS.filter((track) => track.name.toLowerCase().includes(query)).slice(0, 25);
  return autocompleteResult(matches.map((track) => ({ name: track.name, value: track.id })));
}

export const AUTOCOMPLETE_HANDLERS: Record<string, AutocompleteHandler> = {
  tracks: async (interaction) => autocompleteTier(findFocusedOption(interaction.data.options)?.value ?? ''),
  tiers: async (interaction) => autocompleteTrack(findFocusedOption(interaction.data.options)?.value ?? ''),
};
