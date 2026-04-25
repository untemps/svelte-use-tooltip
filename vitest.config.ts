import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		global: true,
		environment: 'jsdom',
		coverage: {
			reporter: ['text', 'lcov'],
			thresholds: {
				statements: 95,
				branches: 90,
				functions: 95,
				lines: 95
			}
		},
		setupFiles: ['./vitest.setup.ts']
	},
	plugins: [sveltekit()]
});
