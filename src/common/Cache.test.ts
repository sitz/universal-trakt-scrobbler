import { Cache, CacheItem } from '@common/Cache';
import { describe, expect, it } from 'vitest';

describe('CacheItem', () => {
	it('round-trips a value through get/set', () => {
		const item = new CacheItem<'itemsToTraktItems'>({});
		expect(item.get('netflix_123')).toBeUndefined();
		item.set('netflix_123', '456');
		expect(item.get('netflix_123')).toBe('456');
	});
});

describe('Cache', () => {
	it('persists entries under the "<key>Cache" storage key and reads them back', async () => {
		const items = await Cache.get('itemsToTraktItems');
		items.set('netflix_123', '456');
		await Cache.set({ itemsToTraktItems: items });

		// A fresh read goes back through storage and recovers the cached value.
		const reloaded = await Cache.get('itemsToTraktItems');
		expect(reloaded.get('netflix_123')).toBe('456');
	});

	it('supports fetching several caches at once', async () => {
		const caches = await Cache.get(['itemsToTraktItems', 'traktItems']);
		expect(caches.itemsToTraktItems).toBeInstanceOf(CacheItem);
		expect(caches.traktItems).toBeInstanceOf(CacheItem);
	});
});
