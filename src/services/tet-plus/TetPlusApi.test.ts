import { Requests } from '@common/Requests';
import { EpisodeItem, MovieItem } from '@models/Item';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TetPlusApi, TetPlusSingleMetadataItem } from './TetPlusApi';

/**
 * Reference test for a streaming-service API. The pattern: stub `Requests.send` with a canned
 * response, then assert the service maps it to the right `Item`. Copy this shape for other services.
 */

const movieResponse: TetPlusSingleMetadataItem = {
	data: { 0: { id: '42', type: 'movie', attributes: { title: 'Dune', year: 2021 } } },
};

const seriesResponse: TetPlusSingleMetadataItem = {
	data: {
		0: {
			id: 'ep-1',
			type: 'series',
			attributes: {
				title: 'Pilot',
				year: 2019,
				'season-nr': 1,
				'episode-nr': 1,
				'series-id': 'show-9',
				'series-name': 'Dark',
				'episode-name': 'Secrets',
			},
		},
	},
};

describe('TetPlusApi.parseMetadata', () => {
	it('maps a movie payload to a MovieItem', () => {
		const item = TetPlusApi.parseMetadata(movieResponse);
		expect(item).toBeInstanceOf(MovieItem);
		expect(item.id).toBe('42');
		expect(item.title).toBe('Dune');
		expect(item.year).toBe(2021);
	});

	it('maps a series payload to an EpisodeItem with show metadata', () => {
		const item = TetPlusApi.parseMetadata(seriesResponse) as EpisodeItem;
		expect(item).toBeInstanceOf(EpisodeItem);
		expect(item.season).toBe(1);
		expect(item.number).toBe(1);
		expect(item.title).toBe('Secrets');
		expect(item.show.title).toBe('Dark');
		expect(item.show.id).toBe('show-9');
	});
});

describe('TetPlusApi.getItem', () => {
	afterEach(() => vi.restoreAllMocks());

	it('fetches the content endpoint and parses the response', async () => {
		const send = vi.spyOn(Requests, 'send').mockResolvedValue(JSON.stringify(movieResponse));

		const item = await TetPlusApi.getItem('42');

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining('/get/content/vods/42'),
				method: 'GET',
			})
		);
		expect(item).toBeInstanceOf(MovieItem);
	});

	it('returns null and swallows failures', async () => {
		vi.spyOn(Requests, 'send').mockRejectedValue(new Error('network down'));
		expect(await TetPlusApi.getItem('42')).toBeNull();
	});
});
