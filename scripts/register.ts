import { config } from 'dotenv';

config({ path: '.dev.vars' });

import { COMMANDS } from '../src/commands/definitions.js';

const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const isGlobal = process.argv.includes('--global');
const clearGuild = process.argv.includes('--clear-guild');

if (!appId || !token) {
  console.error('Missing DISCORD_APPLICATION_ID or DISCORD_TOKEN in .dev.vars');
  process.exit(1);
}

if ((!isGlobal || clearGuild) && !guildId) {
  console.error('Missing DISCORD_GUILD_ID in .dev.vars (required for guild registration/clearing).');
  process.exit(1);
}

async function putCommands(endpoint: string, body: unknown): Promise<Array<{ name: string }>> {
  const res = await fetch(`https://discord.com/api/v10/${endpoint}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to PUT ${endpoint} (${res.status}): ${text}`);
  }

  return res.json() as Promise<Array<{ name: string }>>;
}

// Wipes the guild-scoped commands left over from local development, so once
// global commands are live they don't show up twice in that one server.
if (clearGuild) {
  await putCommands(`applications/${appId}/guilds/${guildId}/commands`, []);
  console.log(`Cleared guild-scoped commands from guild ${guildId}.`);
  process.exit(0);
}

const endpoint = isGlobal ? `applications/${appId}/commands` : `applications/${appId}/guilds/${guildId}/commands`;
const registered = await putCommands(endpoint, COMMANDS);

console.log(`Registered ${registered.length} command(s) ${isGlobal ? 'globally' : `to guild ${guildId}`}:`);
for (const command of registered) {
  console.log(`  /${command.name}`);
}
