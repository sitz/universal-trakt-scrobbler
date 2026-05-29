import { Suggestion } from '@apis/CorrectionApi';
import { TraktAuthDetails } from '@apis/TraktAuth';
import { CacheStorageValues } from '@common/Cache';
import { ScrobbleItemValues } from '@models/Item';
import { TraktItemValues } from '@models/TraktItem';

/**
 * Versioned shapes of the extension's persisted storage.
 *
 * Each `StorageValuesVN` describes the storage as it looked at schema version N; the chain of
 * `Omit<...>` deltas documents exactly what changed between versions. The migration runner in
 * `./migrations` walks a user's stored data up or down between these versions.
 *
 * `StorageValues` / `StorageValuesOptions` / `StorageValuesSyncOptions` always alias the current
 * version. Re-exported from `@common/BrowserStorage` for backwards-compatible imports.
 */

export type StorageValues = StorageValuesV11;
export type StorageValuesOptions = StorageValuesOptionsV4;
export type StorageValuesSyncOptions = StorageValuesSyncOptionsV3;

export type KinoPubAuthDetails = {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	created_at: number;
};

export type StorageValuesV11 = Omit<StorageValuesV10, 'version'> & {
	version?: 11;
	kinoPubAuth?: KinoPubAuthDetails;
};

export type StorageValuesV10 = Omit<StorageValuesV9, 'version' | 'options'> & {
	version?: 10;
	options?: StorageValuesOptionsV4;
};

export type StorageValuesV9 = Omit<StorageValuesV8, 'version'> & {
	version?: 9;
};

export type StorageValuesV8 = Omit<StorageValuesV7, 'version'> & {
	version?: 8;
};

export type StorageValuesV7 = Omit<StorageValuesV6, 'version' | 'hboGoApiParams'> & {
	version?: 7;
};

export type StorageValuesV6 = Omit<
	StorageValuesV5,
	'version' | 'syncOptions' | 'scrobblingItem'
> & {
	version?: 6;
	syncOptions?: StorageValuesSyncOptionsV3;
	scrobblingDetails?: ScrobblingDetails;
} & CacheStorageValues;

export type StorageValuesV5 = Omit<StorageValuesV4, 'version' | 'traktCache'> & {
	version?: 5;
} & CacheStorageValues;

export type StorageValuesV4 = Omit<StorageValuesV3, 'version' | 'correctItems'> & {
	version?: 4;
	corrections?: Partial<Record<string, Suggestion>>;
};

export type StorageValuesV3 = Omit<StorageValuesV2, 'version' | 'options'> & {
	version?: 3;
	options?: StorageValuesOptionsV3;
};

export type StorageValuesV2 = Omit<
	StorageValuesV1,
	'version' | 'options' | 'syncOptions' | 'traktCache' | 'correctUrls' | 'scrobblingItem'
> & {
	version?: 2;
	options?: StorageValuesOptionsV2;
	syncOptions?: StorageValuesSyncOptionsV2;
	traktCache?: Record<string, TraktItemValues>;
	syncCache?: SyncCacheValue;
	correctItems?: Partial<Record<string, Record<string, CorrectItem>>>;
	scrobblingItem?: ScrobbleItemValues;
};

export type StorageValuesV1 = {
	version?: 1;
	auth?: TraktAuthDetails;
	options?: StorageValuesOptionsV1;
	syncOptions?: StorageValuesSyncOptionsV1;
	traktCache?: unknown;
	correctUrls?: Partial<Record<string, Record<string, string>>>;
	scrobblingItem?: unknown;
	scrobblingTabId?: number;
	hboGoApiParams?: unknown;
};

export interface ScrobblingDetails {
	item: ScrobbleItemValues;
	tabId: number | null;
	isPaused: boolean;
}

export type StorageValuesOptionsV4 = StorageValuesOptionsV3 & {
	loadImages: boolean;
};

export type StorageValuesOptionsV3 = Omit<StorageValuesOptionsV2, 'streamingServices'> & {
	services: Record<string, ServiceValue>;
};

export type StorageValuesOptionsV2 = Omit<
	StorageValuesOptionsV1,
	'streamingServices' | 'disableScrobbling'
> & {
	streamingServices: Record<string, ServiceValue>;
	theme: ThemeValue;
};

export type StorageValuesOptionsV1 = {
	streamingServices: Record<string, boolean>;
	disableScrobbling: boolean;
	showNotifications: boolean;
	sendReceiveSuggestions: boolean;
	allowRollbar: boolean;
	grantCookies: boolean;
};

export type ServiceValue = {
	scrobble: boolean;
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	lastSync: number;
	lastSyncId: string;
};

export type ThemeValue = 'light' | 'dark' | 'system';

export type StorageValuesSyncOptionsV3 = Omit<StorageValuesSyncOptionsV2, 'itemsPerLoad'>;

export type StorageValuesSyncOptionsV2 = StorageValuesSyncOptionsV1 & {
	addWithReleaseDateMissing: boolean;
	minPercentageWatched: number;
};

export type StorageValuesSyncOptionsV1 = {
	addWithReleaseDate: boolean;
	hideSynced: boolean;
	itemsPerLoad: number;
};

export type SyncCacheValue = {
	items: ScrobbleItemValues[];
	failed: boolean;
};

export type CorrectItem = {
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
};
