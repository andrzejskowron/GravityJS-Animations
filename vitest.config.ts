import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

	export default defineConfig({
		resolve: {
			alias: {
				gravityjs: resolve(__dirname, 'dist/index.js'),
			},
		},
		test: {
			// Use a DOM-like environment so component/DOM integration tests can
			// exercise `initComponents()` and friends without manual polyfills.
			environment: 'jsdom',
			include: ['tests/**/*.test.ts'],
		},
	});
