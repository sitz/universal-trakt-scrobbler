import { vi } from 'vitest';

/**
 * Test doubles for the global `Shared` singleton (`@common/Shared`).
 *
 * The real `Shared.storage` / `Shared.errors` / `Shared.events` are self-registering
 * singletons that are heavyweight to import in isolation. These factories produce light,
 * fully in-memory replacements so unit tests can exercise code that reads/writes global
 * state without booting the whole extension. They are installed in `test/setup.ts`.
 */

/** Recording stand-in for the `Errors` utility. */
export const createErrorsDouble = () => ({
	log: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	validate: (err: unknown): err is Error => err instanceof Error,
});

/** Minimal synchronous-dispatch stand-in for the `EventDispatcher`. */
export const createEventsDouble = () => {
	const listeners: Record<string, Array<(data: unknown) => unknown>> = {};
	return {
		listeners,
		dispatch: vi.fn(async (eventType: string, _specifier: string | null, data: unknown) => {
			for (const listener of listeners[eventType] ?? []) {
				await listener(data);
			}
		}),
		subscribe: vi.fn(
			(eventType: string, _specifier: string | null, listener: (data: unknown) => unknown) => {
				(listeners[eventType] ??= []).push(listener);
			}
		),
		unsubscribe: vi.fn(
			(eventType: string, _specifier: string | null, listener: (data: unknown) => unknown) => {
				listeners[eventType] = (listeners[eventType] ?? []).filter((fn) => fn !== listener);
			}
		),
	};
};

/** In-memory stand-in for `BrowserStorage`, backed by a plain record. */
export const createStorageDouble = (initial: Record<string, unknown> = {}) => {
	const data: Record<string, unknown> = {
		options: { services: {} },
		syncOptions: {
			hideSynced: false,
			minPercentageWatched: 0,
			addWithReleaseDate: false,
			addWithReleaseDateMissing: false,
		},
		...initial,
	};
	return {
		get options() {
			return data.options;
		},
		get syncOptions() {
			return data.syncOptions;
		},
		get: vi.fn(async (keys: string | string[]) => {
			const wanted = Array.isArray(keys) ? keys : [keys];
			const result: Record<string, unknown> = {};
			for (const key of wanted) {
				result[key] = data[key];
			}
			return result;
		}),
		set: vi.fn(async (values: Record<string, unknown>, _updateOptions?: boolean) => {
			Object.assign(data, values);
		}),
		remove: vi.fn(async (keys: string | string[]) => {
			for (const key of Array.isArray(keys) ? keys : [keys]) {
				delete data[key];
			}
		}),
		updateOptions: vi.fn(),
		updateSyncOptions: vi.fn(),
		/** Test-only escape hatch to read/seed the backing record directly. */
		_data: data,
	};
};
