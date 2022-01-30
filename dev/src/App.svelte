<script>
	import { useTooltip } from '../../src'

	let tooltipTextContent = null
	let useCustomTooltipClass = false
	let tooltipPosition = 'top'
	let isTooltipDisabled = false
	let animateTooltip = false
	let useCustomAnimationEnterClass = false
	let useCustomAnimationLeaveClass = false
	let tooltipEnterDelay = 200
	let tooltipLeaveDelay = 200

	const _onTooltipClick = (arg) => {
		console.log(arg)
	}
</script>

<main>
	<div class="container">
		<div
			use:useTooltip={{
				position: tooltipPosition,
				content: tooltipTextContent,
				contentSelector: !tooltipTextContent?.length ? '.tooltip__content' : null,
				contentClone: true,
				contentActions: {
					'*': {
						eventType: 'click',
						callback: _onTooltipClick,
						callbackParams: ['ok'],
						closeOnCallback: true,
					},
				},
				containerClassName: useCustomTooltipClass ? `tooltip tooltip-${tooltipPosition}` : null,
				animated: animateTooltip,
				animationEnterClassName: useCustomAnimationEnterClass ? 'tooltip-enter' : null,
				animationLeaveClassName: useCustomAnimationLeaveClass ? 'tooltip-leave' : null,
				enterDelay: tooltipEnterDelay,
				leaveDelay: tooltipLeaveDelay,
				disabled: isTooltipDisabled
			}}
			class="target"
		>
			Hover me
		</div>
		<form class="settings__form">
			<h1>Settings</h1>
			<fieldset>
				<label>
					Default Tooltip Content:
					<span class="tooltip__content">Hi! I'm a <i>fancy</i> <strong>tooltip</strong>!</span>
				</label>
			</fieldset>
			<fieldset>
				<label>
					Tooltip Text Content:
					<input type="text" bind:value={tooltipTextContent} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Tooltip Class:
					<input type="checkbox" bind:checked={useCustomTooltipClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Tooltip Position:
					<select bind:value={tooltipPosition}>
						<option value="left">Left</option>
						<option value="right">Right</option>
						<option value="top">Top</option>
						<option value="bottom">Bottom</option>
					</select>
				</label>
			</fieldset>
			<fieldset>
				<label>
					Animate tooltip:
					<input type="checkbox" bind:checked={animateTooltip} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Tooltip Animation Enter Class:
					<input type="checkbox" bind:checked={useCustomAnimationEnterClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Use Custom Tooltip Animation Leave Class:
					<input type="checkbox" bind:checked={useCustomAnimationLeaveClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Tooltip Enter Delay (ms):
					<input type="number" step={100} min={0} bind:value={tooltipEnterDelay} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Tooltip Leave Delay (ms):
					<input type="number" step={100} min={0} bind:value={tooltipLeaveDelay} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Disable Tooltip:
					<input type="checkbox" bind:checked={isTooltipDisabled} />
				</label>
			</fieldset>
		</form>
	</div>
</main>

<style>
	main {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 1rem;
	}

	.container {
		max-width: 640px;
		display: flex;
		flex-direction: column;
		row-gap: 1rem;
	}

	.target {
		width: 10rem;
		height: 3rem;
		background-color: white;
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
		background-color: yellow;
		color: black;
	}

	.settings__form {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 1rem;
		background-color: #eee;
	}

	.settings__form fieldset {
		width: 100%;
		border: none;
	}

	.settings__form label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
	}

	.settings__form input {
		margin: 0;
	}

	.settings__form input[type='checkbox'] {
		padding: 0;
	}

	:global(.tooltip) {
		position: absolute;
		z-index: 9999;
		max-width: 120px;
		background-color: #ee7008;
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 0.5rem;
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
</style>
