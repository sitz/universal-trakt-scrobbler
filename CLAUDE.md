# CLAUDE.md

Guidance for AI agents and new contributors working in this repository. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the full design and [CONTRIBUTING.md](CONTRIBUTING.md)
for the contributor workflow.

## What this is

**Universal Trakt Scrobbler** — a Chrome (Manifest V3) and Firefox (Manifest V2) browser
extension that scrobbles and syncs watched movies/TV from ~29 streaming services to
[Trakt.tv](https://trakt.tv). React 19 + TypeScript (strict) + MUI, bundled with webpack 5,
linted/formatted with Biome, tested with Vitest, managed with pnpm.

## Commands

```bash
pnpm install          # install deps (Node version in .nvmrc; use `nvm use`)
pnpm start            # webpack dev build + watch -> src/build/{chrome,firefox}
pnpm run build-dev    # one-off dev build (no watch)
pnpm run build        # production build -> dist/{chrome,firefox}.zip
pnpm test             # run the Vitest suite once
pnpm run test:watch   # Vitest in watch mode
pnpm run test:cov     # Vitest with V8 coverage -> ./coverage
pnpm run tsc          # type-check only (tsc --noEmit)
pnpm run check        # tsc --noEmit && biome check  (the CI gate)
pnpm run fix          # biome check --write (autofix format + lint)
```

Always run `pnpm run check` and `pnpm test` before considering a change done; both run in CI.

## Architecture in one screen

- **Service-plugin model.** Each streaming service lives in `src/services/<id>/` with up to
  four files: `<Name>Service.ts` (metadata registered via `@models/Service`), `<Name>Api.ts`
  (extends `ServiceApi`, talks to the service + Trakt), `<Name>Parser.ts` (extends
  `ScrobbleParser`, reads playback off the page), and `<id>.ts` (content-script entry).
- **Scrobble engine** (`src/common/`): `ScrobbleEvents` polls the page → `ScrobbleParser`
  reads playback/item → `ScrobbleController` runs the start/pause/stop lifecycle and the 80%
  scrobble threshold → `@apis/TraktScrobble` posts to Trakt.
- **History sync**: `ServiceApi.loadHistory` paginates a service's watch history (with caching
  via `@common/Cache`) and reconciles it against Trakt (`@apis/TraktSearch`, `@apis/TraktSync`).
- **Global state**: the `Shared` singleton (`@common/Shared`) holds `storage`, `errors`,
  `events`, browser/page context, and injected-function registry. `EventDispatcher`
  (`@common/Events`) is the pub/sub bus; `Messaging` (`@common/Messaging`) is the
  content↔background RPC; `Requests` (`@common/Requests`) is the CORS-aware HTTP layer.
- **Storage**: `@common/BrowserStorage` is the slim core; types live in
  `@common/storage/StorageVersions` (versioned schema) and `@common/storage/OptionsTypes`,
  and the version-migration runner is `@common/storage/migrations`.

## Conventions

- **Path aliases** (see `tsconfig.json`): `@apis/*`, `@common/*`, `@components/*`,
  `@contexts/*`, `@models/*`, `@stores/*`, `@services` (generated barrel), `@/*`.
- **Logging**: never use `console.*` directly in app code. Use
  `Shared.errors.error/warning/log/debug`. `debug()` maps to `console.debug` (hidden unless
  the browser console's "Verbose" level is on) — use it for diagnostics like parser fallbacks.
- **TypeScript**: strict mode is on; avoid `any` and `@ts-expect-error`.
- **`ServiceApi` is generic** over its history-item type: prefer
  `extends ServiceApi<MyHistoryItem>` so the history methods are type-checked.

## Testing

- Vitest + jsdom + Testing Library. Config: `vitest.config.ts`; global setup: `test/setup.ts`.
- `webextension-polyfill` is aliased to an in-memory mock (`test/mocks/`), and the `Shared`
  singleton gets fresh in-memory doubles before each test (`test/helpers/shared.ts`).
- Tests live next to source as `*.test.ts`. **Import concrete service files directly** — do
  not import the generated `@services` / `@services-apis` barrels from tests.
- `src/services/tet-plus/TetPlusApi.test.ts` is the reference pattern for a per-service test.

## Build note (gotcha)

`webpack.config.ts` discovers services by **regex-parsing** each `<Name>Service.ts` to extract
the `new Service({...})` definition, then injects imports into `src/services/services.ts` and
`src/services/apis.ts` via `string-replace-loader`. Keep service definitions as plain object
literals so this parser keeps working. New services are scaffolded with
`npx trakt-tools dev create-service`.
