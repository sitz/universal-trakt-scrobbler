import { vi } from 'vitest';

/**
 * In-memory stand-in for the `webextension-polyfill` default export.
 *
 * `@common/Shared` reads `browser.runtime.getURL()` / `getManifest()` at *module load*,
 * so this mock is wired in via `resolve.alias` in `vitest.config.ts` to guarantee it is
 * in place before any extension module is evaluated. It provides just enough surface for
 * the modules under test; extend it as more APIs are exercised.
 */

const localStore = new Map<string, unknown>();

const browser = {
	runtime: {
		// Shared.ts derives the browser name from `getURL('/').split('-')[0]`.
		getURL: (path: string) => `chrome-extension://uts-test${path}`,
		getManifest: () => ({ manifest_version: 3 }),
		sendMessage: vi.fn(async () => undefined),
		connect: vi.fn(() => ({
			onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
			onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
			postMessage: vi.fn(),
			disconnect: vi.fn(),
		})),
		onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
		onConnect: { addListener: vi.fn(), removeListener: vi.fn() },
		lastError: null as { message: string } | null,
		id: 'uts-test',
	},
	storage: {
		local: {
			get: vi.fn(async (keys?: string | string[] | null) => {
				if (keys == null) {
					return Object.fromEntries(localStore);
				}
				const wanted = Array.isArray(keys) ? keys : [keys];
				const result: Record<string, unknown> = {};
				for (const key of wanted) {
					if (localStore.has(key)) {
						result[key] = localStore.get(key);
					}
				}
				return result;
			}),
			set: vi.fn(async (values: Record<string, unknown>) => {
				for (const [key, value] of Object.entries(values)) {
					localStore.set(key, value);
				}
			}),
			remove: vi.fn(async (keys: string | string[]) => {
				for (const key of Array.isArray(keys) ? keys : [keys]) {
					localStore.delete(key);
				}
			}),
			clear: vi.fn(async () => {
				localStore.clear();
			}),
		},
		onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
	},
	tabs: {
		query: vi.fn(async () => []),
		sendMessage: vi.fn(async () => undefined),
		create: vi.fn(async () => ({ id: 1 })),
		remove: vi.fn(async () => undefined),
		onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
		onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
	},
	identity: {
		launchWebAuthFlow: vi.fn(async () => ''),
		getRedirectURL: vi.fn(() => 'chrome-extension://uts-test/'),
	},
	alarms: {
		create: vi.fn(),
		clear: vi.fn(async () => true),
		onAlarm: { addListener: vi.fn(), removeListener: vi.fn() },
	},
	notifications: {
		create: vi.fn(async () => 'notification-id'),
	},
	scripting: {
		executeScript: vi.fn(async () => []),
	},
	browserAction: { setIcon: vi.fn(), setTitle: vi.fn() },
	action: { setIcon: vi.fn(), setTitle: vi.fn() },
	/** Test-only helper to wipe the backing store between tests. */
	__resetLocalStore: () => localStore.clear(),
};

export default browser;
