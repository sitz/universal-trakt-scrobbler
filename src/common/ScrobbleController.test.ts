import { TraktScrobble } from '@apis/TraktScrobble';
import { ScrobbleController } from '@common/ScrobbleController';
import { Shared } from '@common/Shared';
import { createScrobbleItem, MovieItem, ScrobbleItem } from '@models/Item';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorageDouble } from '../../test/helpers/shared';

// Replace the real Trakt network calls with spies so we can assert the lifecycle.
vi.mock('@apis/TraktScrobble', () => ({
	TraktScrobble: { start: vi.fn(), pause: vi.fn(), stop: vi.fn() },
}));

const buildMovie = (progress = 0): MovieItem =>
	createScrobbleItem({
		type: 'movie',
		serviceId: 'netflix',
		id: 'm1',
		title: 'Inception',
		progress,
		trakt: { type: 'movie', id: 123, tmdbId: 456, title: 'Inception', year: 2010, progress: 0 },
	}) as MovieItem;

const buildController = (item: ScrobbleItem | null) => {
	const parser = {
		api: { id: 'netflix' },
		getItem: vi.fn(() => item),
		clearItem: vi.fn(),
	};
	// The controller only reads `parser.api` and calls getItem()/clearItem().
	const controller = new ScrobbleController(parser as never);
	return { controller, parser };
};

describe('ScrobbleController', () => {
	beforeEach(() => {
		// Seed scrobblingDetails so the progress-persistence branch is exercised.
		Shared.storage = createStorageDouble({
			scrobblingDetails: { item: buildMovie().save(), tabId: 1, isPaused: false },
		}) as unknown as typeof Shared.storage;
	});

	it('startScrobble sends the resolved item to Trakt with its current progress', async () => {
		const item = buildMovie(0);
		const { controller } = buildController(item);

		await controller.startScrobble();

		expect(TraktScrobble.start).toHaveBeenCalledTimes(1);
		expect(TraktScrobble.start).toHaveBeenCalledWith(item);
		// progress is mirrored from the item onto its trakt payload before sending.
		expect(item.trakt?.progress).toBe(item.progress);
	});

	it('startScrobble is a no-op when nothing is playing', async () => {
		const { controller } = buildController(null);
		await controller.startScrobble();
		expect(TraktScrobble.start).not.toHaveBeenCalled();
	});

	it('pauseScrobble forwards a pause for a resolved item', async () => {
		const item = buildMovie(40);
		const { controller } = buildController(item);
		await controller.pauseScrobble();
		expect(TraktScrobble.pause).toHaveBeenCalledWith(item);
	});

	it('stopScrobble forwards a stop and clears the parsed item', async () => {
		const item = buildMovie(95);
		const { controller, parser } = buildController(item);
		await controller.stopScrobble();
		expect(TraktScrobble.stop).toHaveBeenCalledWith(item);
		expect(parser.clearItem).toHaveBeenCalledTimes(1);
	});

	it('updateProgress persists and broadcasts once the 80% scrobble threshold is crossed', async () => {
		const item = buildMovie(0);
		const { controller } = buildController(item);

		await controller.updateProgress(85);

		expect(item.progress).toBe(85);
		expect(Shared.storage.set).toHaveBeenCalledWith(
			expect.objectContaining({ scrobblingDetails: expect.anything() }),
			false
		);
		expect(Shared.events.dispatch).toHaveBeenCalledWith(
			'SCROBBLE_PROGRESS',
			null,
			expect.anything()
		);
	});

	it('updateProgress stays quiet for small sub-threshold movements', async () => {
		const item = buildMovie(0);
		const { controller } = buildController(item);

		// First tiny tick (>1%) emits once; a second tick <10% later should not re-emit.
		await controller.updateProgress(2);
		(Shared.storage.set as ReturnType<typeof vi.fn>).mockClear();
		(Shared.events.dispatch as ReturnType<typeof vi.fn>).mockClear();

		await controller.updateProgress(5);

		expect(Shared.storage.set).not.toHaveBeenCalled();
		expect(Shared.events.dispatch).not.toHaveBeenCalled();
	});
});
