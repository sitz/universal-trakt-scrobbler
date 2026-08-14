# Architecture

This document explains how Universal Trakt Scrobbler is put together, so you can find your way
around and add features safely. For commands and conventions see [CLAUDE.md](CLAUDE.md); for the
contributor workflow see [CONTRIBUTING.md](CONTRIBUTING.md).

## Purpose

The extension watches what you play on streaming services (Netflix, HBO Max, Crunchyroll, …)
and **scrobbles** it to [Trakt.tv](https://trakt.tv) in real time, and/or **syncs** your past
watch history. It runs on Chrome (Manifest V3, service-worker background) and Firefox
(Manifest V2, non-persistent background).

## Big picture

```
                         ┌─────────────────────────────────────────────┐
  Streaming service tab  │  Content script  (src/services/<id>/<id>.ts) │
                         │   ScrobbleEvents ─poll→ ScrobbleParser        │
                         │        │ start/pause/stop/progress            │
                         │        ▼                                      │
                         │   ScrobbleController ──► TraktScrobble ──────┐│
                         └───────────────┬───────────────────────────── │┘
                                         │ Messaging (RPC)              ││ HTTP
                                         ▼                              ▼▼
                         ┌─────────────────────────────┐        ┌──────────────┐
                         │  Background service worker   │        │  Trakt API   │
                         │  Requests (CORS), Cache,     │◄──────►│  TMDb API    │
                         │  Session, Notifications      │        └──────────────┘
                         └─────────────────────────────┘
   Extension pages (React): popup, options, history  ── share Shared/Events/Storage
```

## Source layout (`src/`)

| Path | Responsibility |
| --- | --- |
| `modules/background/` | Background service-worker entry; wires up messaging, cache, session. |
| `modules/content/` | Generic content-script bootstrap + Trakt OAuth callback handler. |
| `modules/popup`, `modules/options`, `modules/history` | React entry points for each extension page. |
| `services/<id>/` | One folder per streaming service (see "Service-plugin model"). |
| `apis/` | Trakt + TMDb clients and the `ServiceApi` base class. |
| `common/` | Cross-cutting singletons: `Shared`, `Events`, `Messaging`, `Requests`, `Cache`, `Errors`, the scrobble engine, and storage. |
| `models/` | Data models: `Service`, `Item` (Episode/Movie/Show), `TraktItem`. |
| `components/`, `contexts/`, `stores/`, `pages/` | React UI, context providers, and view-state stores. |
| `_locales/` | WebExtension i18n message catalogs (managed via Crowdin). |

## Service-plugin model

Every streaming service is a self-contained plugin under `src/services/<id>/`:

- **`<Name>Service.ts`** — `new Service({ id, name, hostPatterns, hasScrobbler, hasSync, … })`.
  Services self-register in the `@models/Service` registry. The build also reads this file (see
  "Build & codegen").
- **`<Name>Api.ts`** — extends [`ServiceApi`](src/apis/ServiceApi.ts). Implements
  `getItem(id)` (for scrobbling) and/or the history methods (`loadHistoryItems`,
  `isNewHistoryItem`, `getHistoryItemId`, `convertHistoryItems`, `updateItemFromHistory`) for
  sync. `ServiceApi<THistoryItem>` is **generic** over the service's history-item type — bind
  it (`extends ServiceApi<MyHistoryItem>`) so those methods are type-checked.
- **`<Name>Parser.ts`** — extends [`ScrobbleParser`](src/common/ScrobbleParser.ts). Reads the
  currently-playing item + playback progress. The base class tries, in order: the `<video>`
  element, an injected page script, custom DOM parsing, then a custom fallback — so most
  services only override what they need.
- **`<id>.ts`** — content-script entry that initializes the controller/parser for that service.

`ServiceApi` and `ScrobbleParser` keep registries keyed by service id; controllers/parsers are
looked up lazily by `getScrobbleController(id)` / `getScrobbleParser(id)`.

## Scrobble flow (real-time)

1. `ScrobbleEvents` (`src/common/ScrobbleEvents.ts`) polls the page on an interval.
2. `ScrobbleParser.parsePlayback()` returns `{ isPaused, progress }` and resolves the `Item`.
3. `ScrobbleController` (`src/common/ScrobbleController.ts`) drives the lifecycle:
   - on play → resolve the item against Trakt (`TraktSearch.find`, cached) → `TraktScrobble.start`;
   - on pause → `TraktScrobble.pause`; on stop/tab-close → `TraktScrobble.stop`;
   - `updateProgress()` persists/broadcasts progress, and at **80%** marks the item scrobbled so
     it still counts if the tab closes.
4. `TraktScrobble` (`src/apis/TraktScrobble.ts`) POSTs to `/scrobble/{start,pause,stop}` and
   dispatches `SCROBBLE_SUCCESS` / `SCROBBLE_ERROR` events.

## History sync flow

`ServiceApi.loadHistory` (`src/apis/ServiceApi.ts`) is the engine: it pages through a service's
history (`loadHistoryItems`), de-duplicates against the last sync, caches raw + converted items
via `@common/Cache`, converts them to `Item`s, and reconciles with Trakt history
(`TraktSync.loadHistory`) and search results (`TraktSearch.find`). Results feed the history page
through `@stores/SyncStore`.

## Trakt & TMDb integration (`src/apis/`)

- `TraktApi` — base client; sets API key/version headers and bearer auth via `activate()`.
- `TraktAuth` — OAuth (Chrome `identity.launchWebAuthFlow`; Firefox manual tab flow), token
  storage and refresh.
- `TraktSearch` — resolves an `Item` to a `TraktItem` with multi-layer caching
  (`itemsToTraktItems`, `traktItems`, `urlsToTraktItems`) and user corrections.
- `TraktScrobble` / `TraktSync` / `TraktSettings` — scrobble, history sync, account settings.
- `TmdbApi` — artwork/metadata. `CorrectionApi` — user title corrections.

## Cross-cutting infrastructure (`src/common/`)

- **`Shared`** — global singleton holding `storage`, `errors`, `events`, browser/page context,
  client IDs, and the injected-function registry. Initialized at startup; read everywhere.
- **`Events` (`EventDispatcher`)** — pub/sub bus; global events are mirrored across pages via
  `Messaging`.
- **`Messaging`** — typed RPC between content scripts, extension pages, and the background.
- **`Requests` / `RequestsManager`** — `fetch` wrapper that routes content-script requests
  through the background (CORS), handles Cloudflare/429 rate limiting, and dedupes/cancels by key.
- **`Cache`** — per-key TTL cache backed by `storage.local` (e.g. Trakt history 45m, items 24h,
  TMDb configs 7d).
- **`Errors`** — the logging utility (`error`/`warning`/`log`/`debug`, prefixed `[UTS]`), with
  opt-in Rollbar reporting. **All app logging goes through here, not `console.*`.**

## Storage & migrations

`@common/BrowserStorage` is the runtime core: typed `get`/`set`/`remove`, options + sync-options
schemas, Firefox `storage.sync` chunking, and init. The supporting modules are:

- `@common/storage/StorageVersions` — the versioned storage schema (`StorageValuesV1…V11` and
  the current-version aliases).
- `@common/storage/OptionsTypes` — option-metadata types used to render the options page.
- `@common/storage/migrations` — `upgradeStorage` / `downgradeStorage` walk a user's stored data
  between schema versions (current version: 11).

These are re-exported from `@common/BrowserStorage`, so importing from there still works.

## Build & codegen

`webpack.config.ts` builds per-target bundles and generates `manifest.json` for Chrome (MV3) and
Firefox (MV2). At build time it **discovers services** by regex-parsing each `<Name>Service.ts`
for its `new Service({...})` definition, then injects the service/API imports into
`src/services/services.ts` and `src/services/apis.ts` via `string-replace-loader`. A
circular-dependency check fails the build on cycles. New services are scaffolded with
`npx trakt-tools dev create-service`.

> Known sharp edge: the regex-based service discovery is brittle — keep `Service` definitions as
> plain object literals. Replacing it with typed codegen is a tracked follow-up.

## Testing

Vitest + jsdom drive unit/characterization tests (`*.test.ts` next to source). `Shared` is
replaced with in-memory doubles per test and `webextension-polyfill` is mocked, so engine code
(`ScrobbleController`, `ScrobbleParser`, `TraktScrobble`, `Cache`, `ServiceApi`) can be tested
without a browser. See `test/` and `src/services/tet-plus/TetPlusApi.test.ts`.
