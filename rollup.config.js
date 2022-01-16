import svelte from 'rollup-plugin-svelte'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import postcss from 'rollup-plugin-postcss'
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import visualizer from 'rollup-plugin-visualizer'

const production = process.env.NODE_ENV === 'production'
const target = process.env.BABEL_ENV

export default {
	input: 'src/index.js',
	output: {
		name: 'svelte-use-tooltip',
		file: {
			cjs: 'dist/index.js',
			es: 'dist/index.es.js',
			umd: 'dist/index.umd.js',
		}[target],
		format: target,
		sourcemap: 'inline',
	},
	plugins: [
		svelte(),
		postcss({
			plugins: [],
		}),
		babel({
			exclude: 'node_modules/**',
			babelHelpers: 'bundled',
		}),
		resolve(),
		commonjs(),
		production && terser(),
		visualizer({
			sourcemap: true,
		}),
	],
}
