import '@testing-library/jest-dom/vitest';
import { Shared } from '@common/Shared';
import { beforeEach } from 'vitest';
import browser from 'webextension-polyfill';
import { createErrorsDouble, createEventsDouble, createStorageDouble } from './helpers/shared';

/**
 * Global test setup. Reinstalls fresh `Shared` doubles before every test so global
 * extension state never leaks between cases. Tests that need real behavior (e.g. testing
 * `Errors` or `EventDispatcher` themselves) can import the real module and override locally.
 */
beforeEach(() => {
	// Clear the mock's in-memory browser.storage.local so state can't leak across tests.
	(browser as unknown as { __resetLocalStore: () => void }).__resetLocalStore();
	Shared.storage = createStorageDouble() as unknown as typeof Shared.storage;
	Shared.errors = createErrorsDouble() as unknown as typeof Shared.errors;
	Shared.events = createEventsDouble() as unknown as typeof Shared.events;
	Shared.functionsToInject = {};
	Shared.tabId = null;
	Shared.pageType = 'background';
});
