import { Errors } from '@common/Errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Errors', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('routes debug() to console.debug with a [UTS] prefix', () => {
		const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
		Errors.debug('parser fell back', { method: 'DOM' });
		expect(spy).toHaveBeenCalledWith('[UTS] parser fell back', { method: 'DOM' });
	});

	it('routes error() to console.error and accepts non-Error details', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		Errors.error('boom', 'a string detail');
		expect(spy).toHaveBeenCalledWith('[UTS] boom', 'a string detail');
	});

	it('allows warning() without details', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		Errors.warning('heads up');
		expect(spy).toHaveBeenCalledWith('[UTS] heads up', undefined);
	});

	it('validate() rejects canceled request errors but accepts plain errors', () => {
		expect(Errors.validate(new Error('real'))).toBe(true);
		expect(Errors.validate('not an error')).toBe(false);
	});
});
