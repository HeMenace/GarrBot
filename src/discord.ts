import type { APIInteraction } from 'discord-api-types/v10';
import type { Env } from './env.js';

const API_BASE = 'https://discord.com/api/v10';

export async function discordRequest(env: Env, endpoint: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/garrettj/friend-server-bot, 1.0.0)',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }

  return res;
}

export interface DiscordAttachment {
  filename: string;
  data: Uint8Array;
  contentType?: string;
}

// Separate from discordRequest() because a multipart body needs the runtime to
// set its own Content-Type (with boundary) — we can't fix it to application/json.
export async function postMessageWithAttachment(
  env: Env,
  channelId: string,
  payload: Record<string, unknown>,
  file: DiscordAttachment,
): Promise<void> {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ ...payload, attachments: [{ id: 0, filename: file.filename }] }));
  form.append('files[0]', new Blob([file.data], { type: file.contentType ?? 'image/png' }), file.filename);

  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'User-Agent': 'DiscordBot (https://github.com/garrettj/friend-server-bot, 1.0.0)',
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
}

export async function postMessage(env: Env, channelId: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://github.com/garrettj/friend-server-bot, 1.0.0)',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
}

// Interaction followups use the interaction's own token for auth (no bot
// token needed) and, crucially, can only succeed once Discord has already
// received the initial response — so this must never be awaited before that
// response is returned, or Discord will reject it.
export async function postFollowupMessage(env: Env, interactionToken: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_BASE}/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
}

export function isAdmin(env: Env, userId: string): boolean {
  return env.ADMIN_USER_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

// Guild interactions carry the user under `member.user`; DM/user-installed
// interactions carry it directly under `user`.
export function getInteractionUserId(interaction: APIInteraction): string {
  const userId = interaction.member?.user.id ?? interaction.user?.id;
  if (!userId) throw new Error('Interaction has no user id');
  return userId;
}
