<script lang="ts">
	import { useTooltip } from '$lib';

	let textContent = $state(null);
	let useCustomClass = $state(false);
	let position = $state('top');
	let isDisabled = $state(false);
	let animate = $state(false);
	let useCustomAnimationEnterClass = $state(false);
	let useCustomAnimationLeaveClass = $state(false);
	let enterDelay = $state(50);
	let leaveDelay = $state(50);
	let triggerOnEnter = $state(false);
	let triggerOnLeave = $state(false);
	let offset = $state(10);
	let width = $state('auto');
	let isOpen = $state<boolean | undefined>(undefined);
	let useInteractiveContent = $state(false);
	let touchBehavior = $state<'hover' | 'toggle' | undefined>(undefined);
	let settingsOpen = $state(false);

	const _onTooltipEnter = () => {
		if (triggerOnEnter) {
			alert("You've entered the target");
		}
	};

	const _onTooltipLeave = () => {
		if (triggerOnLeave) {
			alert("You've left the target");
		}
	};

	const _onTooltipClick = (arg, e) => {
		e.preventDefault();
		alert("You've clicked the tooltip");
	};
</script>

<style>
	main {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: stretch;
		margin: 0;
		padding: 0;
		min-height: 100vh;
		min-height: 100svh;
		background-color: #617899;
		font-family:
			monospace,
			-apple-system,
			sans-serif;
		font-size: 0.875rem;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.target {
		width: 90%;
		max-width: 10rem;
		height: 3rem;
		background-color: white;
		border-radius: 6px;
		color: black;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.5);
		font-size: 0.875rem;
	}

	.target:hover {
		cursor: pointer;
		background-color: black;
		color: white;
	}

	.tooltip__content {
		display: flex;
		flex-direction: column;
		row-gap: 0.5rem;
		align-items: center;
	}

	:global(.tooltip__interactive__btn) {
		width: 100%;
		padding: 0.5em 1em;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		border: none;
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	:global(.tooltip__interactive__btn:focus) {
		outline: 2px solid #fff;
		outline-offset: 0;
	}

	:global(.tooltip) {
		position: absolute;
		z-index: 9999;
		width: 90%;
		max-width: 10rem;
		background-color: #ee7008;
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 0.5rem;
		box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.2);
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.875rem;
	}

	:global(.tooltip::after) {
		content: '';
		position: absolute;
		margin-left: -5px;
		border-width: 5px;
		border-style: solid;
	}

	:global(.tooltip-top::after) {
		bottom: -10px;
		left: 50%;
		border-color: #ee7008 transparent transparent transparent;
	}

	:global(.tooltip-bottom::after) {
		top: -10px;
		left: 50%;
		border-color: transparent transparent #ee7008 transparent;
	}

	:global(.tooltip-left::after) {
		top: calc(50% - 5px);
		right: -10px;
		border-color: transparent transparent transparent #ee7008;
	}

	:global(.tooltip-right::after) {
		top: calc(50% - 5px);
		left: -5px;
		border-color: transparent #ee7008 transparent transparent;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(.tooltip-enter) {
			animation: fadeIn 0.2s linear forwards;
		}

		:global(.tooltip-leave) {
			animation: fadeOut 0.2s linear forwards;
		}

		@keyframes fadeIn {
			from {
				opacity: 0;
				transform: translateX(50px);
			}
			to {
				opacity: 1;
				transform: translateX(0);
			}
		}

		@keyframes fadeOut {
			to {
				opacity: 0;
				transform: translateX(-50px);
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.tooltip-enter),
		:global(.tooltip-leave) {
			animation-duration: 0.001ms;
			animation-iteration-count: 1;
		}
	}

	.settings h1 {
		font-size: 1.25rem;
		margin: 0 0 1rem;
	}

	.settings {
		overflow: hidden auto;
		width: 320px;
		min-width: 320px;
		display: flex;
		flex-direction: column;
		color: white;
		background-color: black;
		padding: 2rem;
	}

	@media screen and (min-width: 1024px) {
		.settings {
			width: 420px;
			min-width: 420px;
		}

		.settings__form input:not([type='checkbox']),
		.settings__form textarea,
		.settings__form select {
			flex: 0 0 200px;
			max-width: none;
		}
	}

	.burger {
		display: none;
	}

	.backdrop {
		display: none;
	}

	.settings__close {
		display: none;
	}

	@media screen and (max-width: 480px) {
		.burger {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			position: fixed;
			top: 1rem;
			right: 1rem;
			z-index: 200;
			width: 1rem;
			height: 1rem;
			padding: 0;
			background: none;
			border: none;
			cursor: pointer;
		}

		.burger span {
			display: block;
			width: 100%;
			height: 2px;
			background-color: white;
			border-radius: 2px;
		}

		.backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 300;
			opacity: 0;
			pointer-events: none;
			transition: opacity 0.25s ease;
		}

		.backdrop.open {
			opacity: 1;
			pointer-events: auto;
		}

		.settings {
			position: fixed;
			top: 0;
			right: 0;
			width: min(320px, 90vw);
			min-width: 0;
			min-height: 0;
			height: 100vh;
			height: 100svh;
			z-index: 400;
			transform: translateX(100%);
			transition: transform 0.25s ease;
			overflow-y: auto;
			padding: 1.5rem;
		}

		.settings.open {
			transform: translateX(0);
		}

		.settings__close {
			display: flex;
			align-self: flex-end;
			background: none;
			border: none;
			color: white;
			font-size: 1.25rem;
			cursor: pointer;
			padding: 0;
			margin-bottom: 0.5rem;
			line-height: 1;
		}
	}

	.settings__form {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		row-gap: 1rem;
	}

	.settings__form fieldset {
		width: 100%;
		border: none;
		padding: 0;
	}

	.settings__form__actions {
		display: flex;
		justify-content: flex-end;
	}

	.settings__form label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
	}

	.settings__form input:not([type='checkbox']),
	.settings__form textarea,
	.settings__form select {
		margin: 0;
		width: 100px;
		font-family: inherit;
		font-size: inherit;
	}

	.settings__form input:not([type='checkbox']),
	.settings__form select {
		height: 30px;
	}

	.settings__form textarea {
		padding: 0.5em;
	}

	.settings__form input[type='checkbox'] {
		margin: 0;
		padding: 0;
	}

	.settings__form button {
		padding: 0.5em 1em;
		font-family: inherit;
		font-size: inherit;
	}
</style>

<template id="tooltip__template">
	<span class="tooltip__content">Hi! I'm a <i>fancy</i> <strong>tooltip</strong>!</span>
</template>
<template id="tooltip__interactive__template">
	<div class="tooltip__content">
		<button class="tooltip__interactive__btn">Action 1</button>
		<button class="tooltip__interactive__btn">Action 2</button>
		<span style="font-style: italic;">(Use Tab)</span>
	</div>
</template>
<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') settingsOpen = false;
	}}
/>
<main>
	<button
		class="burger"
		aria-label="Open settings"
		aria-expanded={settingsOpen}
		onclick={() => (settingsOpen = true)}
	>
		<span></span>
		<span></span>
		<span></span>
	</button>
	<div
		class="backdrop"
		class:open={settingsOpen}
		onclick={() => (settingsOpen = false)}
		role="presentation"
	></div>
	<div class="content">
		<div
			use:useTooltip={{
				position: position,
				content: useInteractiveContent ? null : textContent,
				contentSelector: useInteractiveContent
					? '#tooltip__interactive__template'
					: !textContent?.length
						? '#tooltip__template'
						: null,
				contentActions: useInteractiveContent
					? {
							'.tooltip__interactive__btn': {
								eventType: 'click',
								callback: _onTooltipClick,
								callbackParams: ['ok'],
								closeOnCallback: false
							}
						}
					: {
							'*': {
								eventType: 'click',
								callback: _onTooltipClick,
								callbackParams: ['ok'],
								closeOnCallback: true
							}
						},
				containerClassName: useCustomClass ? `tooltip tooltip-${position}` : null,
				animated: animate,
				animationEnterClassName: useCustomAnimationEnterClass ? 'tooltip-enter' : null,
				animationLeaveClassName: useCustomAnimationLeaveClass ? 'tooltip-leave' : null,
				enterDelay: enterDelay,
				leaveDelay: leaveDelay,
				onEnter: _onTooltipEnter,
				onLeave: _onTooltipLeave,
				offset: offset,
				width: width,
				disabled: isDisabled,
				open: isOpen,
				touchBehavior: touchBehavior
			}}
			class="target"
		>
			{touchBehavior ? 'Touch me' : 'Hover me'}
		</div>
	</div>
	<div class="settings" class:open={settingsOpen}>
		<button
			class="settings__close"
			aria-label="Close settings"
			onclick={() => (settingsOpen = false)}>✕</button
		>
		<h1>Settings</h1>
		<form class="settings__form">
			<fieldset>
				<label>
					Text Content:
					<textarea bind:value={textContent} rows={3}></textarea>
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Class:
					<input type="checkbox" bind:checked={useCustomClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Position:
					<select bind:value={position}>
						<option value="left">Left</option>
						<option value="right">Right</option>
						<option value="top">Top</option>
						<option value="bottom">Bottom</option>
					</select>
				</label>
			</fieldset>
			<fieldset>
				<label>
					Animate:
					<input type="checkbox" bind:checked={animate} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Animation Enter Class:
					<input type="checkbox" bind:checked={useCustomAnimationEnterClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Animation Leave Class:
					<input type="checkbox" bind:checked={useCustomAnimationLeaveClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Enter Delay (ms):
					<input type="number" step={100} min={0} bind:value={enterDelay} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Leave Delay (ms):
					<input type="number" step={100} min={0} bind:value={leaveDelay} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Trigger callback on enter:
					<input type="checkbox" bind:checked={triggerOnEnter} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Trigger callback on leave:
					<input type="checkbox" bind:checked={triggerOnLeave} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Offset (px):
					<input type="number" step={1} min={5} bind:value={offset} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Width:
					<input type="text" bind:value={width} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Interactive Content (focus trap):
					<input type="checkbox" bind:checked={useInteractiveContent} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Touch Behavior:
					<select bind:value={touchBehavior}>
						<option value={undefined}>None</option>
						<option value="hover">Hover</option>
						<option value="toggle">Toggle</option>
					</select>
				</label>
			</fieldset>
			<fieldset>
				<label>
					Disable:
					<input type="checkbox" bind:checked={isDisabled} />
				</label>
			</fieldset>
			<fieldset class="settings__form__actions">
				<button type="button" onclick={() => (isOpen = !isOpen)} disabled={isDisabled}>
					{isOpen === true ? 'Masquer la tooltip' : 'Afficher la tooltip'}
				</button>
			</fieldset>
		</form>
	</div>
</main>
