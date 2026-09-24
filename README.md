# Friend Server Bot

A Discord bot for our server, running on Cloudflare Workers. Uses HTTP interactions
(no Gateway connection), D1 for storage, and Workers static assets for images.

## Commands

- `/ping` — health check
- `/smash` — random Super Smash Bros. Ultimate fighters
- `/kart` — random Mario Kart 8 Deluxe character/body/tires/glider
- `/tracks` — random Mario Kart 8 Deluxe tracks, with cup and tier filters
- `/tiers view` / `vote` / `set` / `clear` — Mario Kart track tier list and voting
- `/wotd` — today's Don Cheadle Word of the Day (`/wotd post:true` to force-post, admin-only)

## Running locally

1. `npm install`
2. Copy real values into `.dev.vars` (never commit this file):
   ```
   DISCORD_APPLICATION_ID=
   DISCORD_TOKEN=
   DISCORD_PUBLIC_KEY=
   DISCORD_GUILD_ID=       # your test server's ID, for instant command updates
   ADMIN_USER_IDS=         # comma-separated Discord user IDs
   WOTD_CHANNEL_ID=        # channel the daily word posts to
   ```
3. Apply D1 migrations and seed the tier data locally:
   ```fish
   npx wrangler d1 migrations apply DB --local
   npm run seed
   ```
4. Render the Word of the Day images (needs `assets/wotd/base.png` — see below):
   ```fish
   npm run render-wotd
   ```
5. Start the Worker and a tunnel:
   ```fish
   npm run dev
   ngrok http 8787
   ```
   Paste the ngrok HTTPS URL + `/interactions` into the Developer Portal's
   **Interactions Endpoint URL**, then run `npm run register` to push commands
   to your test guild (instant updates).

Other useful commands:
- `npm run typecheck` — type-checks both the Worker (`src/`) and the Node scripts (`scripts/`)
- `npm run test` — unit tests (tier scoring, tier-filter parsing)

## Adding words (Word of the Day)

1. Add the word (one per line, any case) to `data/words.txt`.
2. Run `npm run render-wotd` to render its image and regenerate `src/data/wotd-words.ts`.
3. Commit and push — the deploy workflow re-renders and redeploys automatically.

Words are picked randomly from those not yet posted; once every word has been
used, it starts over. Use `npm run render-wotd -- --preview WORD` to preview a
single word's layout without adding it to the list, and `--force` to
re-render everything (e.g. after changing `assets/wotd/base.png` or the font).

## Adding images

Fighter/kart images are optional — commands fall back to text if an image is
missing. Drop a PNG named after the item's `id` into the matching folder:

- `public/smash/<id>.png` — see `src/data/smash.ts` for ids
- `public/mk8/characters/<id>.png`, `bodies/`, `tires/`, `gliders/` — see `src/data/mk8-*.ts`

## Changing tiers

Track tiers come from three places, in priority order: an admin override, the
vote average (once a track has 3+ votes), then the seed tier below.

- **Seed tiers**: edit the `grade` column in `data/track-tiers.csv` (must be
  one of the 14 grades in `src/tiers.ts`, or blank for unrated), then run
  `npm run seed` (add `--remote` to update the live database).
- **Overrides**: `/tiers set track:<name> grade:<grade>` (admin-only) to force
  a grade; `/tiers clear track:<name>` to remove it.
- **The scale itself** (grades, scores, S/F thresholds) lives in `src/tiers.ts`.

## Deploying

See the Cloudflare setup steps covered when this project was built (`wrangler
login`, `wrangler d1 create`, `wrangler secret put`, `wrangler deploy`). Once
the D1 database and secrets are set up, pushes to `main` auto-deploy via
`.github/workflows/deploy.yml`.
