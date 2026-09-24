import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
  type APIInteractionResponseCallbackData,
  type APIMessageComponentInteraction,
  type APIMessageStringSelectInteractionData,
} from 'discord-api-types/v10';
import { clearOverride, getAllTrackTierRows, getTrackTierRow, setOverride, upsertVote, type TrackTierRow } from '../db/tiers.js';
import type { HandlerResult } from '../discord-response.js';
import { getInteractionUserId, isAdmin } from '../discord.js';
import type { Env } from '../env.js';
import { getOption } from '../options.js';
import { GRADES, isGrade, type Grade } from '../tiers.js';

const EPHEMERAL = 64;
const VOTE_SELECT_PREFIX = 'tiers_vote_select';
export const VOTE_NEXT_CUSTOM_ID = 'tiers_vote_next';

function ephemeral(content: string): HandlerResult {
  return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: { content, flags: EPHEMERAL } } };
}

// ---------- view ----------

function chunkLines(lines: string[], maxLen = 1000): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function trackLine(row: TrackTierRow): string {
  return `${row.name} (${row.voteCount} vote${row.voteCount === 1 ? '' : 's'})`;
}

async function handleView(env: Env): Promise<HandlerResult> {
  const rows = await getAllTrackTierRows(env);

  const groups = new Map<Grade, TrackTierRow[]>();
  for (const grade of GRADES) groups.set(grade, []);
  const unrated: TrackTierRow[] = [];

  for (const row of rows) {
    if (row.effectiveGrade) groups.get(row.effectiveGrade)!.push(row);
    else unrated.push(row);
  }

  const fields: { name: string; value: string }[] = [];
  for (const grade of GRADES) {
    const tracks = groups.get(grade)!;
    if (tracks.length === 0) continue;
    const lines = [...tracks].sort((a, b) => a.name.localeCompare(b.name)).map(trackLine);
    chunkLines(lines).forEach((chunk, i) => fields.push({ name: i === 0 ? grade : `${grade} (cont.)`, value: chunk }));
  }
  if (unrated.length > 0) {
    const lines = [...unrated].sort((a, b) => a.name.localeCompare(b.name)).map(trackLine);
    chunkLines(lines).forEach((chunk, i) => fields.push({ name: i === 0 ? 'Unrated' : 'Unrated (cont.)', value: chunk }));
  }

  const embeds: APIEmbed[] = [];
  for (let i = 0; i < fields.length; i += 25) {
    embeds.push({ title: i === 0 ? 'Track Tiers' : undefined, color: 0x5865f2, fields: fields.slice(i, i + 25) });
  }
  if (embeds.length === 0) {
    embeds.push({ title: 'Track Tiers', description: 'No tracks found.', color: 0x5865f2 });
  }

  return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: { embeds: embeds.slice(0, 10) } } };
}

// ---------- vote ----------

async function pickTrack(env: Env, preferredId?: string): Promise<TrackTierRow> {
  const rows = await getAllTrackTierRows(env);
  if (preferredId) {
    const found = rows.find((r) => r.id === preferredId);
    if (found) return found;
  }
  const unrated = rows.filter((r) => r.effectiveGrade === null);
  const pool = unrated.length > 0 ? unrated : rows;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildVoteMessageData(row: TrackTierRow): APIInteractionResponseCallbackData {
  const grade = row.effectiveGrade ?? 'Unrated';
  return {
    embeds: [
      {
        title: row.name,
        description: `${row.cup}\nCurrent grade: **${grade}** (${row.voteCount} vote${row.voteCount === 1 ? '' : 's'})`,
        color: 0x5865f2,
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.StringSelect,
            custom_id: `${VOTE_SELECT_PREFIX}:${row.id}`,
            placeholder: 'Pick a grade',
            options: GRADES.map((g) => ({ label: g, value: g })),
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [{ type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Next track', custom_id: VOTE_NEXT_CUSTOM_ID }],
      },
    ],
  };
}

async function handleVote(env: Env, trackId: string | undefined): Promise<HandlerResult> {
  const row = await pickTrack(env, trackId);
  return { response: { type: InteractionResponseType.ChannelMessageWithSource, data: buildVoteMessageData(row) } };
}

export async function handleTiersVoteSelect(interaction: APIMessageComponentInteraction, env: Env): Promise<HandlerResult> {
  const trackId = interaction.data.custom_id.split(':')[1];
  const selectData = interaction.data as APIMessageStringSelectInteractionData;
  const gradeValue = selectData.values[0];
  if (!isGrade(gradeValue)) return ephemeral('Invalid grade.');

  await upsertVote(env, trackId, getInteractionUserId(interaction), gradeValue);
  const row = await getTrackTierRow(env, trackId);
  if (!row) return ephemeral('That track no longer exists.');

  const avg = row.avgScore != null ? row.avgScore.toFixed(1) : 'n/a';
  return ephemeral(
    `Thanks! **${row.name}** now averages ${avg} across ${row.voteCount} vote${row.voteCount === 1 ? '' : 's'} — currently **${row.effectiveGrade ?? 'Unrated'}**.`,
  );
}

export async function handleTiersVoteNext(_interaction: APIMessageComponentInteraction, env: Env): Promise<HandlerResult> {
  const row = await pickTrack(env);
  return { response: { type: InteractionResponseType.UpdateMessage, data: buildVoteMessageData(row) } };
}

// ---------- set / clear (admin only) ----------

async function handleSet(userId: string, env: Env, trackId: string, grade: Grade): Promise<HandlerResult> {
  if (!isAdmin(env, userId)) return ephemeral('You do not have permission to set tier overrides.');
  await setOverride(env, trackId, grade, userId);
  const row = await getTrackTierRow(env, trackId);
  return ephemeral(`Set **${row?.name ?? trackId}** to **${grade}** (override).`);
}

async function handleClear(userId: string, env: Env, trackId: string): Promise<HandlerResult> {
  if (!isAdmin(env, userId)) return ephemeral('You do not have permission to clear tier overrides.');
  await clearOverride(env, trackId);
  const row = await getTrackTierRow(env, trackId);
  return ephemeral(`Cleared the override for **${row?.name ?? trackId}**. It now shows as **${row?.effectiveGrade ?? 'Unrated'}**.`);
}

// ---------- dispatch ----------

export async function handleTiers(interaction: APIChatInputApplicationCommandInteraction, env: Env): Promise<HandlerResult> {
  const sub = interaction.data.options?.[0];
  if (!sub || sub.type !== ApplicationCommandOptionType.Subcommand) {
    return ephemeral('Unknown /tiers usage.');
  }

  const subOptions = sub.options;
  const trackId = getOption<string>(subOptions, 'track');
  const gradeValue = getOption<string>(subOptions, 'grade');

  switch (sub.name) {
    case 'view':
      return handleView(env);
    case 'vote':
      return handleVote(env, trackId ?? undefined);
    case 'set':
      if (!trackId || !gradeValue || !isGrade(gradeValue)) return ephemeral('Missing or invalid track/grade.');
      return handleSet(getInteractionUserId(interaction), env, trackId, gradeValue);
    case 'clear':
      if (!trackId) return ephemeral('Missing track.');
      return handleClear(getInteractionUserId(interaction), env, trackId);
    default:
      return ephemeral('Unknown /tiers subcommand.');
  }
}
