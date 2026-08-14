import { ScrobbleErrorData, SearchErrorData, StorageOptionsChangeData } from '@common/Events';
import { RequestError } from '@common/RequestError';
import { Shared } from '@common/Shared';
import Rollbar from 'rollbar';

class _Errors {
	rollbar?: Rollbar;

	init() {
		this.checkRollbar();
		Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
		Shared.events.subscribe('SCROBBLE_ERROR', null, (data: ScrobbleErrorData) =>
			this.onItemError(data, 'scrobble')
		);
		Shared.events.subscribe('SEARCH_ERROR', null, (data: SearchErrorData) =>
			this.onItemError(data, 'find')
		);
	}

	onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options && 'allowRollbar' in data.options) {
			this.checkRollbar();
		}
	};

	checkRollbar() {
		const { allowRollbar } = Shared.storage.options;
		if (allowRollbar && !this.rollbar) {
			this.rollbar = new Rollbar({
				accessToken: Shared.rollbarToken,
				autoInstrument: {
					network: false, // Do not set to true on Firefox (see https://github.com/rollbar/rollbar.js/issues/638).
				},
				captureIp: false,
				captureUncaught: true,
				captureUnhandledRejections: true,
				payload: {
					environment: Shared.environment,
				},
			});
			if (window) {
				window.Rollbar = this.rollbar;
			}
		} else if (!allowRollbar && this.rollbar) {
			delete this.rollbar;
			if (window) {
				delete window.Rollbar;
			}
		}
	}

	async onItemError(
		data: ScrobbleErrorData | SearchErrorData,
		type: 'scrobble' | 'find'
	): Promise<void> {
		if (data.error) {
			const values = await Shared.storage.get('auth');
			if (values.auth && values.auth.access_token) {
				this.error(`Failed to ${type} item.`, data.error);
			} else {
				this.warning(`Failed to ${type} item.`, data.error);
			}
		}
	}

	/**
	 * Logs an informational message. Use for one-time, expected events (e.g. storage
	 * migrations) — not for per-frame or polling output, which should use {@link debug}.
	 */
	log(message: Error | string, details?: unknown): void {
		console.log(`[UTS] ${message.toString()}`, details);
	}

	/**
	 * Logs a low-level diagnostic. Routed to `console.debug`, which browsers hide unless the
	 * "Verbose" log level is enabled, so it stays quiet in production while remaining available
	 * when troubleshooting (e.g. a scrobble parser failing). Never reported to Rollbar.
	 */
	debug(message: string, details?: unknown): void {
		console.debug(`[UTS] ${message}`, details);
	}

	warning(message: string, details?: unknown): void {
		console.warn(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.warning(message, this.toRollbarPayload(details));
		}
	}

	error(message: string, details?: unknown): void {
		console.error(`[UTS] ${message}`, details);
		if (this.rollbar) {
			this.rollbar.error(message, this.toRollbarPayload(details));
		}
	}

	private toRollbarPayload(details?: unknown): string | undefined {
		if (details instanceof Error) {
			return details.message;
		}
		return typeof details === 'string' ? details : undefined;
	}

	validate(err: unknown): err is Error {
		if (err instanceof RequestError) {
			return !err.isCanceled;
		}

		return err instanceof Error;
	}
}

export const Errors = new _Errors();

Shared.errors = Errors;
