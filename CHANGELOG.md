# [3.13.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.12.0...v3.13.0) (2026-04-18)


### Features

* Support array of actions per selector in contentActions ([#179](https://github.com/untemps/svelte-use-tooltip/issues/179)) ([0e71b1e](https://github.com/untemps/svelte-use-tooltip/commit/0e71b1e45d9b8aadacdc2def4ce6cd96563d489e))

# [3.12.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.11.0...v3.12.0) (2026-04-16)


### Features

* Add dev-mode warnings for missing or unresolvable content ([#178](https://github.com/untemps/svelte-use-tooltip/issues/178)) ([2bbfc9e](https://github.com/untemps/svelte-use-tooltip/commit/2bbfc9eb9795296d032ddc6dfcd7b20042872bc7))

# [3.11.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.10.0...v3.11.0) (2026-04-15)


### Features

* Make interactive tooltip keyboard-accessible without auto-focus glitch ([#177](https://github.com/untemps/svelte-use-tooltip/issues/177)) ([cbf150a](https://github.com/untemps/svelte-use-tooltip/commit/cbf150a75825a8d4ed5f0768b5c392ef226dfe73))

# [3.10.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.9.0...v3.10.0) (2026-04-12)


### Features

* Reposition tooltip on resize/scroll instead of hiding it ([#176](https://github.com/untemps/svelte-use-tooltip/issues/176)) ([94ce25f](https://github.com/untemps/svelte-use-tooltip/commit/94ce25f5ecb3c53eab980a2bf0b61860d14045f1))

# [3.9.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.8.2...v3.9.0) (2026-04-12)


### Features

* Add touchBehavior prop for touch/mobile support ([#174](https://github.com/untemps/svelte-use-tooltip/issues/174)) ([7e6fae7](https://github.com/untemps/svelte-use-tooltip/commit/7e6fae77548b16ee88e13fe55b13b317b45877b9))

## [3.8.2](https://github.com/untemps/svelte-use-tooltip/compare/v3.8.1...v3.8.2) (2026-04-11)


### Bug Fixes

* Close tooltip on scroll inside ancestor scroll containers ([#173](https://github.com/untemps/svelte-use-tooltip/issues/173)) ([03ba10a](https://github.com/untemps/svelte-use-tooltip/commit/03ba10af06833b233874da03cb94db6d70b31f9d))

## [3.8.1](https://github.com/untemps/svelte-use-tooltip/compare/v3.8.0...v3.8.1) (2026-04-11)


### Bug Fixes

* Skip leave animation on structural rebuild to prevent race condition ([#172](https://github.com/untemps/svelte-use-tooltip/issues/172)) ([1fbc56a](https://github.com/untemps/svelte-use-tooltip/commit/1fbc56af536e8be0f68aacd09cdde05f8c2c36a4))

# [3.8.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.7.0...v3.8.0) (2026-04-11)


### Features

* Respect prefers-reduced-motion in CSS animations ([#171](https://github.com/untemps/svelte-use-tooltip/issues/171)) ([70eee7b](https://github.com/untemps/svelte-use-tooltip/commit/70eee7b03a8512c4dbaaed0eac9b4a1004629184))

# [3.7.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.6.0...v3.7.0) (2026-04-11)


### Features

* Implement focus trap for interactive tooltip content ([#169](https://github.com/untemps/svelte-use-tooltip/issues/169)) ([08f3dcf](https://github.com/untemps/svelte-use-tooltip/commit/08f3dcfcfc9b6380bd87479d7878f2c410914038))

# [3.6.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.5.0...v3.6.0) (2026-04-10)


### Features

* Add aria-haspopup="dialog" to trigger when tooltip has interactive content ([#168](https://github.com/untemps/svelte-use-tooltip/issues/168)) ([e57848d](https://github.com/untemps/svelte-use-tooltip/commit/e57848dd06c0cb1dafae1938d03775a6f76f0c8a))

# [3.5.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.4.1...v3.5.0) (2026-04-10)


### Features

* Add aria-expanded to trigger when tooltip has interactive content ([#166](https://github.com/untemps/svelte-use-tooltip/issues/166)) ([e9c9cc3](https://github.com/untemps/svelte-use-tooltip/commit/e9c9cc3266f20ee1b3f8a47c6924fea41a280aae))

## [3.4.1](https://github.com/untemps/svelte-use-tooltip/compare/v3.4.0...v3.4.1) (2026-04-10)


### Bug Fixes

* Generate unique IDs for aria-describedby to avoid ARIA collisions ([#165](https://github.com/untemps/svelte-use-tooltip/issues/165)) ([37d0fe7](https://github.com/untemps/svelte-use-tooltip/commit/37d0fe7635a977600cb84a51deb0f123cf987f29))

# [3.4.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.7...v3.4.0) (2026-04-10)


### Features

* Expose programmatic show/hide API via open prop ([#163](https://github.com/untemps/svelte-use-tooltip/issues/163)) ([1886922](https://github.com/untemps/svelte-use-tooltip/commit/18869226b35aa40405a3f009f687d5d0bf9bbfd6))

## [3.3.7](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.6...v3.3.7) (2026-04-09)


### Bug Fixes

* Prune destroyed instances from static #instances array ([#159](https://github.com/untemps/svelte-use-tooltip/issues/159)) ([d38fcb8](https://github.com/untemps/svelte-use-tooltip/commit/d38fcb8a278627a914496b05f3a97757a3c76ec8)), closes [#instances](https://github.com/untemps/svelte-use-tooltip/issues/instances)

## [3.3.6](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.5...v3.3.6) (2026-04-08)


### Bug Fixes

* Guard observer callbacks after destroy ([#157](https://github.com/untemps/svelte-use-tooltip/issues/157)) ([9c1e329](https://github.com/untemps/svelte-use-tooltip/commit/9c1e3291d9247c6bea8357560d7915c7c510d990))

## [3.3.5](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.4...v3.3.5) (2026-04-06)


### Bug Fixes

* Add timeout fallback to prevent animation hang ([#156](https://github.com/untemps/svelte-use-tooltip/issues/156)) ([9831e85](https://github.com/untemps/svelte-use-tooltip/commit/9831e85ea0dcc5fdddc83eed5e534225a1416204))

## [3.3.4](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.3...v3.3.4) (2026-04-06)


### Bug Fixes

* Hide tooltip immediately when disabled via update ([#154](https://github.com/untemps/svelte-use-tooltip/issues/154)) ([7cd696e](https://github.com/untemps/svelte-use-tooltip/commit/7cd696ea7f1085f8b29b6994a74f5adaf1cf515f))

## [3.3.3](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.2...v3.3.3) (2026-04-06)


### Bug Fixes

* Restore title attribute on destroy ([#153](https://github.com/untemps/svelte-use-tooltip/issues/153)) ([d87290c](https://github.com/untemps/svelte-use-tooltip/commit/d87290cc929c6e5e0cac41f4d91df200861ec8c9))

## [3.3.2](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.1...v3.3.2) (2026-04-06)


### Bug Fixes

* Use style.position instead of setAttribute to preserve consumer inline styles ([#151](https://github.com/untemps/svelte-use-tooltip/issues/151)) ([a8af271](https://github.com/untemps/svelte-use-tooltip/commit/a8af271b493ede9574a484a30aa5d7cf3857fe66))

## [3.3.1](https://github.com/untemps/svelte-use-tooltip/compare/v3.3.0...v3.3.1) (2026-04-06)

### Bug Fixes

- Remove stale vendor.d.ts and surface hidden type errors ([#150](https://github.com/untemps/svelte-use-tooltip/issues/150)) ([0948b9c](https://github.com/untemps/svelte-use-tooltip/commit/0948b9cc69e4648b4c194ea0d1477589971c3185))

# [3.3.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.2.0...v3.3.0) (2026-04-01)

### Features

- migrate codebase to TypeScript ([#117](https://github.com/untemps/svelte-use-tooltip/issues/117)) ([45590cf](https://github.com/untemps/svelte-use-tooltip/commit/45590cf64a7d9a7005e944421633d1c794e4b7c0))

# [3.2.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.1.0...v3.2.0) (2026-03-29)

### Features

- Flip tooltip position when it overflows the viewport ([#115](https://github.com/untemps/svelte-use-tooltip/issues/115)) ([8d2ed2c](https://github.com/untemps/svelte-use-tooltip/commit/8d2ed2c56a37a9275264ec898b9feeafbf8294a2))

# [3.1.0](https://github.com/untemps/svelte-use-tooltip/compare/v3.0.0...v3.1.0) (2026-03-28)

### Features

- Add width prop ([#114](https://github.com/untemps/svelte-use-tooltip/issues/114)) ([3a22a70](https://github.com/untemps/svelte-use-tooltip/commit/3a22a700c8abe7609871554811cc29e7ed2bb51e))

# [3.0.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.8.0...v3.0.0) (2024-12-01)

# [2.8.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.7.4...v2.8.0) (2022-11-19)

### Features

- Trigger callbacks on tooltip enter and leave ([#61](https://github.com/untemps/svelte-use-tooltip/issues/61)) ([c4d9e2f](https://github.com/untemps/svelte-use-tooltip/commit/c4d9e2fd346ba7d6b2812c539e6c7a379f25c9f2))

## [2.7.4](https://github.com/untemps/svelte-use-tooltip/compare/v2.7.3...v2.7.4) (2022-10-07)

### Bug Fixes

- Reset target position and additional attribute on destroy properly ([7e1a75d](https://github.com/untemps/svelte-use-tooltip/commit/7e1a75d28f933210206f8a0c62b5ebc7467f5514))

## [2.7.3](https://github.com/untemps/svelte-use-tooltip/compare/v2.7.2...v2.7.3) (2022-10-05)

### Bug Fixes

- Reset target position on destroy ([#57](https://github.com/untemps/svelte-use-tooltip/issues/57)) ([5bdc051](https://github.com/untemps/svelte-use-tooltip/commit/5bdc051b24b6b574a9738f53e3cb7d5623471ed0))

## [2.7.2](https://github.com/untemps/svelte-use-tooltip/compare/v2.7.1...v2.7.2) (2022-07-07)

### Bug Fixes

- Fix tooltip animation management ([#42](https://github.com/untemps/svelte-use-tooltip/issues/42)) ([b6a6f58](https://github.com/untemps/svelte-use-tooltip/commit/b6a6f58728f845176396f5f8af1cdd087809ff0c))

## [2.7.1](https://github.com/untemps/svelte-use-tooltip/compare/v2.7.0...v2.7.1) (2022-07-05)

### Bug Fixes

- Fix tooltip focus management ([#41](https://github.com/untemps/svelte-use-tooltip/issues/41)) ([3f92ca5](https://github.com/untemps/svelte-use-tooltip/commit/3f92ca5356b5aa91f4bf8e8fbfc2193d0b384d81))

# [2.7.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.6.0...v2.7.0) (2022-02-11)

### Features

- Remove tooltip max-width ([#35](https://github.com/untemps/svelte-use-tooltip/issues/35)) ([da4b041](https://github.com/untemps/svelte-use-tooltip/commit/da4b0414cdcaad08f080d3f45c55f744e07a9dc6))

## [2.6.1-beta.1](https://github.com/untemps/svelte-use-tooltip/compare/v2.6.0...v2.6.1-beta.1) (2022-02-10)

# [2.6.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.5.0...v2.6.0) (2022-02-08)

### Features

- Allow to set a template element as tooltip content ([#30](https://github.com/untemps/svelte-use-tooltip/issues/30)) ([5f3e582](https://github.com/untemps/svelte-use-tooltip/commit/5f3e582011657f7abfbcc9bd717424382fed373d))

# [2.5.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.4.0...v2.5.0) (2022-02-05)

### Features

- Hide tooltip on window resize and scroll events ([#28](https://github.com/untemps/svelte-use-tooltip/issues/28)) ([4255353](https://github.com/untemps/svelte-use-tooltip/commit/42553531497251fa002e9b4c0e0a320ee782b7dd))

# [2.4.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.3.2...v2.4.0) (2022-02-03)

### Features

- Add missing a11y features ([#27](https://github.com/untemps/svelte-use-tooltip/issues/27)) ([3bcb198](https://github.com/untemps/svelte-use-tooltip/commit/3bcb198bcf5ecd54ea61ef8f911904dd7f300435)), closes [#11](https://github.com/untemps/svelte-use-tooltip/issues/11) [#11](https://github.com/untemps/svelte-use-tooltip/issues/11)

## [2.3.2](https://github.com/untemps/svelte-use-tooltip/compare/v2.3.1...v2.3.2) (2022-02-03)

### Bug Fixes

- Fix hovering area position ([#26](https://github.com/untemps/svelte-use-tooltip/issues/26)) ([d289a1f](https://github.com/untemps/svelte-use-tooltip/commit/d289a1f294440aeffbd4d2e68df8dd4cbd445f6a))

## [2.3.1](https://github.com/untemps/svelte-use-tooltip/compare/v2.3.0...v2.3.1) (2022-02-02)

### Bug Fixes

- Fix interactions with tooltip content, [#17](https://github.com/untemps/svelte-use-tooltip/issues/17) ([9137cd2](https://github.com/untemps/svelte-use-tooltip/commit/9137cd292d9147bcf3624463ae039fd1112da364))

# [2.3.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.2.0...v2.3.0) (2022-01-31)

### Features

- Extend hovering area ([#21](https://github.com/untemps/svelte-use-tooltip/issues/21)) ([c70463d](https://github.com/untemps/svelte-use-tooltip/commit/c70463db44cacd63de7bf283d590826cfec4df24))

# [2.2.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.1.2...v2.2.0) (2022-01-31)

### Features

- Add offset prop ([#20](https://github.com/untemps/svelte-use-tooltip/issues/20)) ([340c859](https://github.com/untemps/svelte-use-tooltip/commit/340c85902ca1c616fe20706784219dd9f315659c))

## [2.1.2](https://github.com/untemps/svelte-use-tooltip/compare/v2.1.1...v2.1.2) (2022-01-30)

### Bug Fixes

- Fix classNames reassignment when containerClassName is updated ([#19](https://github.com/untemps/svelte-use-tooltip/issues/19)) ([7f672d0](https://github.com/untemps/svelte-use-tooltip/commit/7f672d0f296ae2618054f425fccf0aabebd54da7))

## [2.1.1](https://github.com/untemps/svelte-use-tooltip/compare/v2.1.0...v2.1.1) (2022-01-30)

### Bug Fixes

- Fix CSS classes reassignment when content is updated ([#16](https://github.com/untemps/svelte-use-tooltip/issues/16)) ([1468f78](https://github.com/untemps/svelte-use-tooltip/commit/1468f788928e68b02d45ef95e525762bf9e826b0))

# [2.1.0](https://github.com/untemps/svelte-use-tooltip/compare/v2.0.0...v2.1.0) (2022-01-30)

### Features

- Add enterDelay and leaveDelay props ([#14](https://github.com/untemps/svelte-use-tooltip/issues/14)) ([b660877](https://github.com/untemps/svelte-use-tooltip/commit/b660877b0d59b7f3a3f4a142feb6e6eeadf7b817)), closes [#10](https://github.com/untemps/svelte-use-tooltip/issues/10) [#10](https://github.com/untemps/svelte-use-tooltip/issues/10)

# [2.0.0](https://github.com/untemps/svelte-use-tooltip/compare/v1.2.0...v2.0.0) (2022-01-27)

### Features

- Add content prop ([#12](https://github.com/untemps/svelte-use-tooltip/issues/12)) ([ea03acd](https://github.com/untemps/svelte-use-tooltip/commit/ea03acd63a97da5863f101f64d9600bddbb0fc8e))

### BREAKING CHANGES

- `contentClassName` has been renamed `containerClassName` to be more consistent

# [1.2.0](https://github.com/untemps/svelte-use-tooltip/compare/v1.1.0...v1.2.0) (2022-01-25)

### Features

- Animate tooltip ([#7](https://github.com/untemps/svelte-use-tooltip/issues/7)) ([b132de6](https://github.com/untemps/svelte-use-tooltip/commit/b132de6e306c7a16b5b104bb028b066c4227ac7a))

# [1.1.0](https://github.com/untemps/svelte-use-tooltip/compare/v1.0.0...v1.1.0) (2022-01-25)

### Features

- Add position prop ([#5](https://github.com/untemps/svelte-use-tooltip/issues/5)) ([125be23](https://github.com/untemps/svelte-use-tooltip/commit/125be23343a342f4974e35419ace036709ae1eb7))

# 1.0.0 (2022-01-16)

### Features

- Initial commit ([ce7286d](https://github.com/untemps/svelte-use-tooltip/commit/ce7286d50a19c88ad3010a7e114870d13a04ad62))
