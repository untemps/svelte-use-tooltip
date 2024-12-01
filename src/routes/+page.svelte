<script>
	import { useTooltip } from '$lib';

	let textContent = null;
	let useCustomClass = false;
	let position = 'top';
	let isDisabled = false;
	let animate = false;
	let useCustomAnimationEnterClass = false;
	let useCustomAnimationLeaveClass = false;
	let enterDelay = 50;
	let leaveDelay = 50;
	let triggerOnEnter = false;
	let triggerOnLeave = false;
	let offset = 10;

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
		align-items: center;
		margin: 0;
		padding: 0;
		height: 100%;
		background-color: #617899;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
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

	.settings {
		overflow: hidden auto;
		width: 320px;
		min-width: 320px;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		color: white;
		background-color: black;
		padding: 2rem;
	}

	@media screen and (max-width: 480px) {
		.settings {
			display: none;
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

	.settings__form label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
	}

	.settings__form input {
		margin: 0;
		max-width: 100px;
		height: 30px;
	}

	.settings__form select {
		margin: 0;
		max-width: 80px;
		height: 30px;
	}

	.settings__form input[type='checkbox'] {
		padding: 0;
	}
</style>

<template id="tooltip__template">
	<span class="tooltip__content">Hi! I'm a <i>fancy</i> <strong>tooltip</strong>!</span>
</template>
<main>
	<div class="content">
		<div
			use:useTooltip={{
				position: position,
				content: textContent,
				contentSelector: !textContent?.length ? '#tooltip__template' : null,
				contentActions: {
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
				disabled: isDisabled
			}}
			class="target"
		>
			Hover me
		</div>
	</div>
	<div class="settings">
		<h1>Settings</h1>
		<form class="settings__form">
			<fieldset>
				<label>
					Text Content:
					<input type="text" bind:value={textContent} />
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
					Disable:
					<input type="checkbox" bind:checked={isDisabled} />
				</label>
			</fieldset>
		</form>
	</div>
</main>
