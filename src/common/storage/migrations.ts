import { Shared } from '@common/Shared';
import type { BrowserStorageSetValues } from '@common/storage/OptionsTypes';
import type {
	StorageValues,
	StorageValuesOptions,
	StorageValuesOptionsV1,
	StorageValuesOptionsV2,
	StorageValuesOptionsV3,
	StorageValuesOptionsV4,
	StorageValuesSyncOptions,
	StorageValuesSyncOptionsV1,
	StorageValuesSyncOptionsV2,
	StorageValuesSyncOptionsV3,
} from '@common/storage/StorageVersions';

/**
 * The subset of `BrowserStorage` the migration runner needs. `BrowserStorage` builds this from
 * its own (partly private) methods and hands it to the functions below, so the version-migration
 * logic lives outside the storage class without widening its public surface.
 */
export interface MigrationContext {
	currentVersion: number;
	get: (keys?: keyof StorageValues | (keyof StorageValues)[] | null) => Promise<StorageValues>;
	set: (values: BrowserStorageSetValues, doSync: boolean) => Promise<void>;
	doSet: (values: StorageValues, doSync: boolean) => Promise<void>;
	doRemove: (
		keys: keyof StorageValues | (keyof StorageValues)[],
		doSync?: boolean
	) => Promise<void>;
}

/**
 * `objectVX` and `objectVY` are always the same object.
 * They are only separated by type, to make it easier to understand the upgrade process.
 */
export const upgradeStorage = async (ctx: MigrationContext, version: number): Promise<void> => {
	if (version < 2 && ctx.currentVersion >= 2) {
		Shared.errors.log('Upgrading to v2...');

		await ctx.doRemove(
			['traktCache', 'correctUrls', 'scrobblingItem'] as unknown as (keyof StorageValues)[],
			true
		);

		const values = await ctx.get('options');

		const optionsV1 = values.options as Partial<StorageValuesOptionsV1> | undefined;
		const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
		if (optionsV1 && optionsV2) {
			if (optionsV1.streamingServices && optionsV2.streamingServices) {
				for (const [id, value] of Object.entries(optionsV1.streamingServices)) {
					if (typeof value !== 'boolean') {
						continue;
					}

					optionsV2.streamingServices[id] = {
						scrobble: value,
						sync: value,
						autoSync: false,
						autoSyncDays: 0,
						lastSync: 0,
						lastSyncId: '',
					};
				}
			}

			delete optionsV1.disableScrobbling;

			await ctx.doSet({ options: optionsV2 as unknown as StorageValuesOptions }, true);
		}
	}

	if (version < 3 && ctx.currentVersion >= 3) {
		Shared.errors.log('Upgrading to v3...');

		const values = await ctx.get('options');

		const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
		const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
		if (optionsV2 && optionsV3) {
			optionsV3.services = optionsV2.streamingServices;

			delete optionsV2.streamingServices;

			await ctx.doSet({ options: optionsV3 as unknown as StorageValuesOptions }, true);
		}
	}

	if (version < 4 && ctx.currentVersion >= 4) {
		Shared.errors.log('Upgrading to v4...');

		await ctx.doRemove(['correctItems'] as unknown as (keyof StorageValues)[], true);
	}

	if (version < 5 && ctx.currentVersion >= 5) {
		Shared.errors.log('Upgrading to v5...');

		await ctx.doRemove(['traktCache'] as unknown as (keyof StorageValues)[], true);
	}

	if (version < 6 && ctx.currentVersion >= 6) {
		Shared.errors.log('Upgrading to v6...');

		await ctx.doRemove(['scrobblingItem'] as unknown as (keyof StorageValues)[], true);

		const values = await ctx.get('syncOptions');

		const optionsV2 = values.syncOptions as Partial<StorageValuesSyncOptionsV2> | undefined;
		const optionsV3 = values.syncOptions as Partial<StorageValuesSyncOptionsV3> | undefined;
		if (optionsV2 && optionsV3) {
			delete optionsV2.itemsPerLoad;

			await ctx.doSet({ syncOptions: optionsV3 as unknown as StorageValuesSyncOptions }, true);
		}
	}

	if (version < 7 && ctx.currentVersion >= 7) {
		Shared.errors.log('Upgrading to v7...');

		const { options } = await ctx.get('options');

		if (options?.services && 'hbo-go' in options.services) {
			options.services['hbo-max'] = options.services['hbo-go'];
			options.services['hbo-max'].lastSync = 0;
			options.services['hbo-max'].lastSyncId = '';
			delete options.services['hbo-go'];

			await ctx.doSet({ options }, true);
		}
	}

	if (version < 8 && ctx.currentVersion >= 8) {
		Shared.errors.log('Upgrading to v8...');

		const { options } = await ctx.get('options');

		if (options?.services && 'telia-play' in options.services) {
			delete options.services['telia-play'];

			await ctx.doSet({ options }, true);
		}
	}

	if (version < 9 && ctx.currentVersion >= 9) {
		Shared.errors.log('Upgrading to v9...');

		await ctx.doRemove(['itemsCache', 'syncCache', 'traktItemsCache'], true);
	}

	if (version < 10 && ctx.currentVersion >= 10) {
		Shared.errors.log('Upgrading to v10...');
	}

	if (version < 11 && ctx.currentVersion >= 11) {
		Shared.errors.log('Upgrading to v11...');

		const { options } = await ctx.get('options');

		if (options?.services && 'crunchyroll-beta' in options.services) {
			delete options.services['crunchyroll-beta'];

			await ctx.doSet({ options }, true);
		}
	}

	await ctx.set({ version: ctx.currentVersion } as BrowserStorageSetValues, true);

	Shared.errors.log('Upgraded!');
};

/**
 * `objectVX` and `objectVY` are always the same object.
 * They are only separated by type, to make it easier to understand the downgrade process.
 */
export const downgradeStorage = async (ctx: MigrationContext, version: number): Promise<void> => {
	if (version > 10 && ctx.currentVersion <= 10) {
		Shared.errors.log('Downgrading to v10...');
		const values = await ctx.get('options');
		const options = values.options;
		if (options) {
			delete options.services['crunchyroll'];
			await ctx.doSet({ options: options as unknown as StorageValuesOptions }, true);
		}
	}

	if (version > 9 && ctx.currentVersion <= 9) {
		Shared.errors.log('Downgrading to v9...');

		const values = await ctx.get('options');

		const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
		const optionsV4 = values.options as Partial<StorageValuesOptionsV4> | undefined;
		if (optionsV3 && optionsV4) {
			delete optionsV4.loadImages;

			await ctx.doSet({ options: optionsV3 as unknown as StorageValuesOptions }, true);
		}
	}

	if (version > 8 && ctx.currentVersion <= 8) {
		Shared.errors.log('Downgrading to v8...');

		await ctx.doRemove(['itemsCache', 'syncCache', 'traktItemsCache'], true);
	}

	if (version > 7 && ctx.currentVersion <= 7) {
		Shared.errors.log('Downgrading to v7...');
	}

	if (version > 6 && ctx.currentVersion <= 6) {
		Shared.errors.log('Downgrading to v6...');
	}

	if (version > 5 && ctx.currentVersion <= 5) {
		Shared.errors.log('Downgrading to v5...');

		await ctx.doRemove(['scrobblingDetails'] as unknown as (keyof StorageValues)[], true);
	}

	if (version > 4 && ctx.currentVersion <= 4) {
		Shared.errors.log('Downgrading to v4...');

		await ctx.doRemove(
			[
				'historyCache',
				'historyItemsToItemsCache',
				'imageUrlsCache',
				'itemsCache',
				'itemsToTraktItemsCache',
				'servicesDataCache',
				'suggestionsCache',
				'tmdbApiConfigsCache',
				'traktHistoryItemsCache',
				'traktItemsCache',
				'traktSettingsCache',
				'urlsToTraktItemsCache',
			] as unknown as (keyof StorageValues)[],
			true
		);
	}

	if (version > 3 && ctx.currentVersion <= 3) {
		Shared.errors.log('Downgrading to v3...');

		await ctx.doRemove(['corrections'] as unknown as (keyof StorageValues)[], true);
	}

	if (version > 2 && ctx.currentVersion <= 2) {
		Shared.errors.log('Downgrading to v2...');

		const values = await ctx.get('options');

		const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
		const optionsV3 = values.options as Partial<StorageValuesOptionsV3> | undefined;
		if (optionsV2 && optionsV3) {
			optionsV2.streamingServices = optionsV3.services;

			delete optionsV3.services;

			await ctx.doSet({ options: optionsV2 as unknown as StorageValuesOptions }, true);
		}
	}

	if (version > 1 && ctx.currentVersion <= 1) {
		Shared.errors.log('Downgrading to v1...');

		await ctx.doRemove(
			[
				'traktCache',
				'syncCache',
				'correctItems',
				'scrobblingItem',
			] as unknown as (keyof StorageValues)[],
			true
		);

		const values = await ctx.get(['options', 'syncOptions']);

		const optionsV1 = values.options as Partial<StorageValuesOptionsV1> | undefined;
		const optionsV2 = values.options as Partial<StorageValuesOptionsV2> | undefined;
		if (optionsV1 && optionsV2) {
			if (optionsV1.streamingServices && optionsV2.streamingServices) {
				for (const [id, value] of Object.entries(optionsV2.streamingServices)) {
					if (typeof value === 'boolean') {
						continue;
					}

					optionsV1.streamingServices[id] = value.scrobble || value.sync;
				}
			}

			delete optionsV2.theme;

			await ctx.doSet({ options: optionsV1 as unknown as StorageValuesOptions }, true);
		}

		const syncOptionsV1 = values.syncOptions as Partial<StorageValuesSyncOptionsV1> | undefined;
		const syncOptionsV2 = values.syncOptions as Partial<StorageValuesSyncOptionsV2> | undefined;
		if (syncOptionsV1 && syncOptionsV2) {
			delete syncOptionsV2.addWithReleaseDateMissing;
			delete syncOptionsV2.minPercentageWatched;

			await ctx.doSet({ syncOptions: syncOptionsV1 as unknown as StorageValuesSyncOptions }, true);
		}
	}

	await ctx.set({ version: ctx.currentVersion } as BrowserStorageSetValues, true);

	Shared.errors.log('Downgraded!');
};
