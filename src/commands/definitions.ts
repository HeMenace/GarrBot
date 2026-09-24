import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { TRACKS } from '../data/mk8-tracks.js';
import { GRADES } from '../tiers.js';

const INTEGRATION_TYPES = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
const CONTEXTS = [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel];

export const PING_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'ping',
  description: 'Replies with pong',
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
};

export const SMASH_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'smash',
  description: 'Get random Super Smash Bros. Ultimate fighters',
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'count',
      description: 'How many fighters to return (default 3)',
      min_value: 1,
      max_value: 8,
      required: false,
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: 'allow_duplicates',
      description: 'Allow the same fighter more than once',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: 'exclude_echoes',
      description: 'Exclude echo fighters',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: 'exclude_miis',
      description: 'Exclude Mii fighters',
      required: false,
    },
  ],
};

export const KART_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'kart',
  description: 'Get a random Mario Kart 8 Deluxe character, body, tires, and glider',
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
};

const CUP_NAMES = [...new Set(TRACKS.map((track) => track.cup))];

export const TRACKS_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'tracks',
  description: 'Get random Mario Kart 8 Deluxe tracks',
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'count',
      description: 'How many tracks to return (default 4)',
      min_value: 1,
      max_value: 16,
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'cup',
      description: 'Only pick tracks from this cup',
      required: false,
      choices: CUP_NAMES.map((cup) => ({ name: cup, value: cup })),
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'tier',
      description: 'Filter by tier, e.g. "C", "C+", "S-B", "A- to B+"',
      required: false,
      autocomplete: true,
    },
  ],
};

const GRADE_CHOICES = GRADES.map((grade) => ({ name: grade, value: grade }));

export const TIERS_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'tiers',
  description: 'View, vote on, and manage Mario Kart track tier rankings',
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'view',
      description: 'Show tracks grouped by tier',
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'vote',
      description: 'Vote on a track’s tier (random track if none given)',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'track',
          description: 'Track to vote on',
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'set',
      description: 'Admin: set an override grade for a track',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'track',
          description: 'Track to override',
          required: true,
          autocomplete: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'grade',
          description: 'Grade to force',
          required: true,
          choices: GRADE_CHOICES,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'clear',
      description: 'Admin: remove an override grade for a track',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'track',
          description: 'Track to clear the override for',
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
};

export const WOTD_COMMAND: RESTPostAPIChatInputApplicationCommandsJSONBody = {
  name: 'wotd',
  description: "Show today's Don Cheadle Word of the Day",
  type: ApplicationCommandType.ChatInput,
  integration_types: INTEGRATION_TYPES,
  contexts: CONTEXTS,
  options: [
    {
      type: ApplicationCommandOptionType.Boolean,
      name: 'post',
      description: "Admin: force today's post now (for testing)",
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'add',
      description: 'Admin: add word(s) to the list, comma-separated (e.g. "SERENDIPITY, HOT DOG")',
      required: false,
    },
  ],
};

// Every slash command gets registered here, so the register script and the
// Worker's command router always agree on what exists.
export const COMMANDS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  PING_COMMAND,
  SMASH_COMMAND,
  KART_COMMAND,
  TRACKS_COMMAND,
  TIERS_COMMAND,
  WOTD_COMMAND,
];
