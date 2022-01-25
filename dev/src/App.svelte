<script>
	import { useTooltip } from '../../src'

	let useCustomTooltipClass = false
	let animateTooltip = false

    const _onTooltipClick = (arg, event) => {
		console.log(arg)
    }
</script>

<main>
	<div class="container">
		<div use:useTooltip={{
					contentSelector: '.tooltip__content',
					contentClone: false,
					contentActions: {
						 '#button1': {
            eventType: 'mouseenter',
            callback: (arg) => console.log(arg),
            callbackParams: ['Haha you\'re hovering the button 1'],
            closeOnCallback: false
        },
        '#button2': {
            eventType: 'mouseenter',
            callback: (arg1, arg2) => console.log(arg1, arg2),
            callbackParams: ['Haha you\'re hovering the', 'button 2'],
            closeOnCallback: false
        },
        '#button2': {
            eventType: 'click',
            callback: (arg1, arg2) => console.log(arg1, arg2),
            callbackParams: ['Haha you\'ve clicked the', 'button 2'],
            closeOnCallback: true
        },
					},
					contentClassName: useCustomTooltipClass ? 'tooltip' : null,
					disabled: false,
					animated: animateTooltip
				}} class="tooltip__target">Hover me</div>
        <span class="tooltip__content">
			<button id="button1">Action 1</button>
			<button id="button2">Action 2</button>
		</span>
		<form class="settings__form">
			<h1>Settings</h1>
			<fieldset>
				<label>
					Use Custom Tooltip Class:
					<input type="checkbox" bind:checked={useCustomTooltipClass} />
				</label>
			</fieldset>
			<fieldset>
				<label>
					Animate tooltip:
					<input type="checkbox" bind:checked={animateTooltip} />
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

	.tooltip__target {
		width: 10rem;
        height: 3rem;
        background-color: white;
        color: black;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 5px 0 rgba(0,0,0,0.5);
	}

    .tooltip__target:hover {
        cursor: pointer;
        background-color: black;
        color: white;
    }

	.tooltip__content {
		color: white
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
		top: 100%;
		left: 50%;
		margin-left: -5px;
		border-width: 5px;
		border-style: solid;
		border-color: #ee7008 transparent transparent transparent;
	}
</style>
