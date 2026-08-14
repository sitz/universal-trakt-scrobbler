import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Resolves the `@common/*`, `@apis/*`, ... aliases straight from tsconfig.json.
	plugins: [tsconfigPaths()],
	resolve: {
		alias: {
			// Force every `import browser from 'webextension-polyfill'` onto the in-memory mock
			// so module-load-time browser API calls (e.g. in Shared.ts) don't blow up under jsdom.
			'webextension-polyfill': path.resolve('test/mocks/webextension-polyfill.ts'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./test/setup.ts'],
		include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
		clearMocks: true,
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,tsx}'],
			exclude: [
				'src/**/*.{test,spec}.{ts,tsx}',
				'src/**/*.d.ts',
				'src/services/services.ts',
				'src/services/apis.ts',
			],
		},
	},
});
