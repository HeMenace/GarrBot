export interface Env {
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  DISCORD_GUILD_ID: string;
  ADMIN_USER_IDS: string;
  WOTD_CHANNEL_ID: string;
  GITHUB_REPO: string;
  GITHUB_TOKEN: string;
  DB: D1Database;
  ASSETS: Fetcher;
}
