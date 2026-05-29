import { createScrobbleItem, EpisodeItem, MovieItem } from '@models/Item';
import { describe, expect, it } from 'vitest';

describe('EpisodeItem', () => {
	// `BaseItem`'s constructor calls `generateId()` before `EpisodeItem` assigns `this.show`,
	// so episodes are always constructed with an explicit id in practice; we pass one here and
	// exercise `generateId()` as a direct method call.
	const buildEpisode = () =>
		createScrobbleItem({
			type: 'episode',
			serviceId: 'netflix',
			id: 'dark-s1-e1-secrets',
			title: 'Secrets',
			season: 1,
			number: 1,
			show: { type: 'show', serviceId: 'netflix', title: 'Dark' },
		}) as EpisodeItem;

	it('generates a slug id from show, season, number and title', () => {
		expect(buildEpisode().generateId()).toBe('dark-s1-e1-secrets');
	});

	it('derives the database id from serviceId and id', () => {
		expect(buildEpisode().getDatabaseId()).toBe('netflix_dark-s1-e1-secrets');
	});

	it('formats a human-readable full title', () => {
		expect(buildEpisode().getFullTitle()).toBe('Dark S1 E1 - Secrets');
	});

	it('clones into an independent EpisodeItem instance', () => {
		const item = buildEpisode();
		const clone = item.clone();
		expect(clone).toBeInstanceOf(EpisodeItem);
		expect(clone).not.toBe(item);
		expect(clone.id).toBe(item.id);
		expect(clone.show).not.toBe(item.show);
	});
});

describe('MovieItem', () => {
	it('applies known title corrections and slugifies the id', () => {
		const movie = createScrobbleItem({
			type: 'movie',
			serviceId: 'netflix',
			// `correctTitles` maps this to 'The Office (US)'.
			title: 'The Office (U.S.)',
		}) as MovieItem;
		expect(movie.title).toBe('The Office (US)');
		expect(movie.id).toBe('theofficeus');
	});

	it('rounds progress to two decimal places', () => {
		const movie = createScrobbleItem({
			type: 'movie',
			serviceId: 'netflix',
			title: 'Inception',
			progress: 12.3456,
		}) as MovieItem;
		expect(movie.progress).toBe(12.35);
	});
});
