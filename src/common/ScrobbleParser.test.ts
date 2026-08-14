import { ScrobbleParser, ScrobblePlayback } from '@common/ScrobbleParser';
import { createScrobbleItem, MovieItem, ScrobbleItem } from '@models/Item';
import { describe, expect, it } from 'vitest';

/**
 * Minimal concrete parser that lets a test drive the "custom" fallback methods directly,
 * exercising the shared derivation logic in `ScrobbleParser.parsePlayback`.
 */
class TestParser extends ScrobbleParser {
	playbackToReturn: Partial<ScrobblePlayback> | null = null;
	itemToReturn: ScrobbleItem | null = null;

	constructor() {
		super({ id: 'test-parser' } as never, {
			videoPlayerSelector: null,
			watchingUrlRegex: null,
		});
	}

	protected parsePlaybackFromCustom() {
		// Real services return a fresh object each poll; copy so `parsePlayback`'s in-place
		// mutation of `isPaused` doesn't leak back into our fixture between calls.
		return this.playbackToReturn ? { ...this.playbackToReturn } : null;
	}

	protected parseItemFromCustom() {
		return this.itemToReturn;
	}
}

const buildMovie = () =>
	createScrobbleItem({
		type: 'movie',
		serviceId: 'test-parser',
		id: 'm1',
		title: 'Inception',
	}) as MovieItem;

describe('ScrobbleParser.parsePlayback', () => {
	it('derives progress from currentTime/duration and resolves the item', async () => {
		const parser = new TestParser();
		parser.itemToReturn = buildMovie();
		parser.playbackToReturn = { isPaused: false, currentTime: 30, duration: 120 };

		const playback = await parser.parsePlayback();

		expect(playback).toEqual({ isPaused: false, progress: 25 });
		expect(parser.getItem()).toBe(parser.itemToReturn);
	});

	it('returns null when playback is detected but no item can be identified', async () => {
		const parser = new TestParser();
		parser.itemToReturn = null;
		parser.playbackToReturn = { isPaused: false, currentTime: 30, duration: 120 };

		expect(await parser.parsePlayback()).toBeNull();
	});

	it('infers a pause when progress does not advance between polls', async () => {
		const parser = new TestParser();
		parser.itemToReturn = buildMovie();
		parser.playbackToReturn = { progress: 40 };

		const first = await parser.parsePlayback();
		expect(first?.isPaused).toBe(false);

		// Same progress on the next poll => treated as paused/stalled.
		const second = await parser.parsePlayback();
		expect(second?.isPaused).toBe(true);
	});

	it('ignores zero progress (nothing meaningfully started yet)', async () => {
		const parser = new TestParser();
		parser.itemToReturn = buildMovie();
		parser.playbackToReturn = { isPaused: false, progress: 0 };

		expect(await parser.parsePlayback()).toBeNull();
	});

	it('clearItem resets the parsed item', async () => {
		const parser = new TestParser();
		parser.itemToReturn = buildMovie();
		parser.playbackToReturn = { isPaused: false, currentTime: 10, duration: 100 };
		await parser.parsePlayback();
		expect(parser.getItem()).not.toBeNull();

		parser.clearItem();
		expect(parser.getItem()).toBeNull();
	});
});
