import { TraktScrobble } from '@apis/TraktScrobble';
import { Shared } from '@common/Shared';
import { createScrobbleItem, MovieItem } from '@models/Item';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStorageDouble } from '../../test/helpers/shared';

const buildMovieWithTrakt = (progress = 50): MovieItem =>
	createScrobbleItem({
		type: 'movie',
		serviceId: 'netflix',
		id: 'm1',
		title: 'Inception',
		progress,
		trakt: { type: 'movie', id: 123, tmdbId: 456, title: 'Inception', year: 2010, progress },
	}) as MovieItem;

describe('TraktScrobble.send', () => {
	afterEach(() => vi.restoreAllMocks());

	it('POSTs the correct payload and broadcasts SCROBBLE_SUCCESS', async () => {
		vi.spyOn(TraktScrobble, 'activate').mockResolvedValue(undefined);
		const send = vi.spyOn(TraktScrobble.requests, 'send').mockResolvedValue('{}');

		const item = buildMovieWithTrakt(50);
		await TraktScrobble.send(item.trakt!, TraktScrobble.START);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				url: `${TraktScrobble.SCROBBLE_URL}/start`,
				method: 'POST',
				body: { movie: { ids: { trakt: 123 } }, progress: 50 },
			})
		);
		expect(Shared.events.dispatch).toHaveBeenCalledWith(
			'SCROBBLE_SUCCESS',
			null,
			expect.objectContaining({ scrobbleType: TraktScrobble.START })
		);
	});

	it('broadcasts SCROBBLE_ERROR when the request fails', async () => {
		vi.spyOn(TraktScrobble, 'activate').mockResolvedValue(undefined);
		vi.spyOn(TraktScrobble.requests, 'send').mockRejectedValue(new Error('boom'));

		const item = buildMovieWithTrakt(50);
		await TraktScrobble.send(item.trakt!, TraktScrobble.STOP);

		expect(Shared.events.dispatch).toHaveBeenCalledWith(
			'SCROBBLE_ERROR',
			null,
			expect.objectContaining({ scrobbleType: TraktScrobble.STOP, error: expect.any(Error) })
		);
	});
});

describe('TraktScrobble lifecycle', () => {
	afterEach(() => vi.restoreAllMocks());

	it('start sends a start and broadcasts SCROBBLE_START', async () => {
		const send = vi.spyOn(TraktScrobble, 'send').mockResolvedValue(undefined);
		const item = buildMovieWithTrakt();

		await TraktScrobble.start(item);

		expect(send).toHaveBeenCalledWith(item.trakt, TraktScrobble.START);
		expect(Shared.events.dispatch).toHaveBeenCalledWith('SCROBBLE_START', null, expect.anything());
	});

	it('stop sends a stop, clears stored details, and broadcasts SCROBBLE_STOP', async () => {
		const item = buildMovieWithTrakt();
		Shared.storage = createStorageDouble({
			scrobblingDetails: { item: item.save(), tabId: null, isPaused: false },
		}) as unknown as typeof Shared.storage;
		const send = vi.spyOn(TraktScrobble, 'send').mockResolvedValue(undefined);

		await TraktScrobble.stop(item);

		expect(send).toHaveBeenCalledWith(item.trakt, TraktScrobble.STOP);
		expect(Shared.storage.remove).toHaveBeenCalledWith('scrobblingDetails', false);
		expect(Shared.events.dispatch).toHaveBeenCalledWith('SCROBBLE_STOP', null, expect.anything());
	});

	it('stop is a no-op when there is nothing being scrobbled', async () => {
		const send = vi.spyOn(TraktScrobble, 'send').mockResolvedValue(undefined);
		await TraktScrobble.stop();
		expect(send).not.toHaveBeenCalled();
	});
});
