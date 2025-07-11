import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		global: true,
		environment: 'jsdom',
		coverage: {
			reporter: ['text', 'lcov']
		},
		setupFiles: ['./vitest.setup.js']
	},
	plugins: [sveltekit()]
});
