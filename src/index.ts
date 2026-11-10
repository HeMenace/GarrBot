import { verifyKey } from 'discord-interactions';
import { postFollowupMessage } from './discord.js';
import { toHttpResponse } from './discord-response.js';
import type { Env } from './env.js';
import { handleInteraction } from './router.js';
import { runWotdPost } from './wotd-post.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'GET') {
      return new Response('OK');
    }

    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    if (!signature || !timestamp) {
      return new Response('Missing signature headers', { status: 401 });
    }

    const isValid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);
    const result = await handleInteraction(interaction, env);
    const httpResponse = toHttpResponse(result);

    if (result.followup) {
      const followupPayload = result.followup;
      ctx.waitUntil(
        (async () => {
          // Small buffer so this can never land in the channel before the
          // main response Discord is about to receive from this request.
          await new Promise((resolve) => setTimeout(resolve, 300));
          await postFollowupMessage(env, interaction.token, followupPayload);
        })().catch((err) => {
          console.error('Followup message failed:', err);
        }),
      );
    }

    return httpResponse;
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runWotdPost(env).catch((err) => {
        console.error('WOTD scheduled post failed:', err);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
