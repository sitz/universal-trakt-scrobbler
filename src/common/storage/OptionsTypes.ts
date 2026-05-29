import { Manifest as WebExtManifest } from 'webextension-polyfill';
import type {
	StorageValues,
	StorageValuesOptions,
	StorageValuesSyncOptions,
} from '@common/storage/StorageVersions';

/**
 * Describes how each option/sync-option is rendered and validated on the options page
 * (control type, choices, permissions/origins it requires, dependencies, etc.).
 * Re-exported from `@common/BrowserStorage` for backwards-compatible imports.
 */

export type OptionsDetails = {
	[K in keyof StorageValuesOptions]: OptionDetails<StorageValuesOptions, K>;
};

export type SyncOptionsDetails = {
	[K in keyof StorageValuesSyncOptions]: OptionDetails<StorageValuesSyncOptions, K>;
};

export type OptionDetails<T, K extends keyof T = keyof T> =
	| SelectOptionDetails<T, K>
	| SwitchOptionDetails<T, K>
	| TextFieldOptionDetails<T, K>
	| NumericTextFieldOptionDetails<T, K>
	| CustomOptionDetails<T, K>;

export type OptionDetailsByType<
	T,
	U extends OptionDetails<T, K>['type'],
	K extends keyof T = keyof T,
> = U extends 'select'
	? SelectOptionDetails<T, K>
	: U extends 'switch'
		? SwitchOptionDetails<T, K>
		: U extends 'text'
			? TextFieldOptionDetails<T, K>
			: U extends 'number'
				? NumericTextFieldOptionDetails<T, K>
				: U extends 'custom'
					? CustomOptionDetails<T, K>
					: OptionDetails<T, K>;

export type BaseOptionDetails<T, K extends keyof T> = {
	id: K;
	value: T[K];
	origins?: string[];
	permissions?: WebExtManifest.OptionalPermission[];
	dependencies?: (keyof T)[];
	doShow: boolean;
};

export interface SelectOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'select';
	value: string;
	choices: Record<string, string>;
}

export interface SwitchOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'switch';
	value: boolean;
}

export interface TextFieldOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'text';
	value: string;
}

export interface NumericTextFieldOptionDetails<T, K extends keyof T>
	extends Omit<BaseOptionDetails<T, K>, 'value'> {
	type: 'number';
	value: number;
	isFloat?: number;
	minValue?: number;
	maxValue?: number;
	step?: number;
}

export interface CustomOptionDetails<T, K extends keyof T> extends BaseOptionDetails<T, K> {
	type: 'custom';
}

export type BrowserStorageSetValues = Omit<StorageValues, 'options' | 'syncOptions'>;

export type BrowserStorageRemoveKey = Exclude<keyof StorageValues, 'options' | 'syncOptions'>;
