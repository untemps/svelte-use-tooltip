// TypeScript keeps side-effect imports in declaration files, so svelte-package emits
// `import './useTooltip.css'` in dist/useTooltip.d.ts. Consumers that type-check libraries
// (skipLibCheck: false) then get TS2882, since noUncheckedSideEffectImports is on by default
// since TypeScript 6 and a stylesheet has no type declarations. The import means nothing for
// types and the JavaScript files keep it, so strip it from the declaration files.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const cssImport = /^import ['"][^'"]+\.css['"];\r?\n/gm;

for (const name of readdirSync(dir)) {
	if (!name.endsWith('.d.ts')) continue;
	const file = join(dir, name);
	const source = readFileSync(file, 'utf-8');
	const stripped = source.replace(cssImport, '');
	if (stripped !== source) writeFileSync(file, stripped);
}
