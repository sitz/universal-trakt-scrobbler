# Contributing

Thanks for helping improve Universal Trakt Scrobbler! This guide covers local setup, the
day-to-day workflow, and what's expected in a pull request. For the design, read
[ARCHITECTURE.md](ARCHITECTURE.md); for a quick command/convention reference, see
[CLAUDE.md](CLAUDE.md).

## Local setup

1. Create a Trakt application at https://trakt.tv/oauth/applications/new (enable the
   `/scrobble` permission). Set the redirect URI to `https://trakt.tv/apps` and the CORS
   origins to `moz-extension://` and `chrome-extension://`.
2. Copy the environment template and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   Set `TRAKT_CLIENT_ID`/`TRAKT_CLIENT_SECRET` (and optionally `TMDB_API_KEY`,
   `ROLLBAR_TOKEN`, extension IDs). A development build works without secrets, but
   login/scrobbling needs the Trakt credentials.
3. Use the Node version pinned in `.nvmrc`, then install with pnpm:
   ```bash
   nvm use && pnpm install
   ```
4. Start the watch build and load the unpacked extension from `src/build/chrome` (Chrome) or
   `src/build/firefox` (Firefox):
   ```bash
   pnpm start
   ```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm start` | Dev build + watch into `src/build/{chrome,firefox}`. |
| `pnpm run build-dev` | One-off dev build. |
| `pnpm run build` | Production build → `dist/{chrome,firefox}.zip`. |
| `pnpm test` / `pnpm run test:watch` / `pnpm run test:cov` | Run the Vitest suite. |
| `pnpm run check` | `tsc --noEmit && biome check` — the CI gate. |
| `pnpm run fix` | Autofix formatting/lint with Biome. |

## Adding a streaming service

1. Scaffold it: `npx trakt-tools dev create-service` (answer the prompts). This generates the
   `src/services/<id>/` folder and registers the service.
2. Implement the generated `<Name>Api.ts` / `<Name>Parser.ts`. Extend `ServiceApi<MyHistoryItem>`
   (bind the generic) and `ScrobbleParser`. Look at an existing service of similar shape — e.g.
   `tet-plus` (tiny, scrobble-only), `viaplay`/`tv2-play` (sync), `netflix` (complex).
3. Add a characterization test next to the API (`<Name>Api.test.ts`) following
   `src/services/tet-plus/TetPlusApi.test.ts`. **Import the concrete files, not the `@services`
   barrel.**
4. Run `npx trakt-tools dev update-readme` to refresh the supported-services table.

## Coding conventions

- **TypeScript strict** — no `any`, avoid `@ts-expect-error`. Prefer real types at the
  `ServiceApi` seam by binding its generic.
- **Logging** — use `Shared.errors.error/warning/log/debug`, never `console.*`. Use `debug()`
  for high-volume diagnostics (it maps to `console.debug`, hidden unless "Verbose" is enabled).
- **Imports** — use the path aliases (`@common/*`, `@apis/*`, …) defined in `tsconfig.json`.
- **Formatting/lint** — Biome (`biome.json`). Run `pnpm run fix` before committing; a pre-commit
  hook (husky + lint-staged) also runs Biome on staged files.

## Tests

- The project uses **Vitest** (`vitest.config.ts`, setup in `test/setup.ts`). `Shared` is
  swapped for in-memory doubles per test and `webextension-polyfill` is mocked, so most engine
  code can be tested without a browser.
- Add or update tests for the behavior you change, especially in the scrobble engine
  (`src/common/`), the Trakt APIs (`src/apis/`), and service parsers.
- **Tests before refactors**: when restructuring complex untested code (e.g. a large service
  API), add characterization tests that lock current behavior first.

## Pull requests

Before opening a PR, make sure both gates pass locally — they also run in CI
(`.github/workflows/`):

```bash
pnpm run check   # type-check + lint/format
pnpm test        # unit tests
```

Then sanity-check the real extension with `pnpm run build-dev` and a manual smoke test
(log into Trakt, play something on one service, confirm start/pause/stop).

## Translations

Localization is crowdsourced via [Crowdin](https://crowdin.com/project/universal-trakt-scrobbler).
Don't edit non-English `src/_locales/*/messages.json` by hand — contribute through Crowdin instead.
