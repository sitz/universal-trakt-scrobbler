import { Utils } from '@common/Utils';
import { describe, expect, it } from 'vitest';

describe('Utils.unix', () => {
	it('truncates millisecond timestamps to whole seconds', () => {
		expect(Utils.unix(1_600_000_000_000)).toBe(1_600_000_000);
	});

	it('passes through values already in seconds', () => {
		expect(Utils.unix(1_600_000_000)).toBe(1_600_000_000);
	});

	it('parses ISO date strings to unix seconds', () => {
		expect(Utils.unix('2020-09-13T12:26:40.000Z')).toBe(1_600_000_000);
	});
});

describe('Utils.dateDiff', () => {
	it('is true when the gap is within the threshold', () => {
		expect(Utils.dateDiff(1_600_000_000, 1_600_000_030, 60)).toBe(true);
	});

	it('is false when the gap exceeds the threshold', () => {
		expect(Utils.dateDiff(1_600_000_000, 1_600_000_120, 60)).toBe(false);
	});
});

describe('Utils.convertToISOString', () => {
	it('converts unix seconds to an ISO string', () => {
		expect(Utils.convertToISOString(1_600_000_000)).toBe('2020-09-13T12:26:40.000Z');
	});

	it('returns undefined for a falsy value', () => {
		expect(Utils.convertToISOString(0)).toBeUndefined();
		expect(Utils.convertToISOString(undefined)).toBeUndefined();
	});
});

describe('Utils.replace', () => {
	it('substitutes {placeholders} from the replacement object', () => {
		expect(Utils.replace('Hello {name}!', { name: 'World' })).toBe('Hello World!');
	});
});
