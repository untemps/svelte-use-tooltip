<script>
	import { useTooltip } from '../../src'

	let tooltipPosition = 'top'
	let useCustomTooltipClass = false
	let isTooltipDisabled = false
	let animateTooltip = false
	let useCustomAnimationEnterClass = false
	let useCustomAnimationLeaveClass = false

    const _onTooltipClick = (arg, event) => {
		console.log(arg)
    }
</script>

<main>
	<div class="container">
		<div use:useTooltip={{
			        position: tooltipPosition,
					contentSelector: '.tooltip__button',
					contentClone: false,
					contentActions: {
						'*': {
							eventType: 'click',
							callback: _onTooltipClick,
							callbackParams: ['ok'],
							closeOnCallback: true
						},
					},
					contentClassName: useCustomTooltipClass ? 'tooltip' : null,
					disabled: isTooltipDisabled,
					animated: animateTooltip
					animationEnterClassName: useCustomAnimationEnterClass ? 'tooltip-enter' : null,
					animationLeaveClassName: useCustomAnimationLeaveClass ? 'tooltip-leave' : null
				}} class="target">Hover me</div>
        <span class="tooltip__button">Hi! I'm a fancy tooltip!</span>
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
        box-shadow: 0 0 5px 0 rgba(0,0,0,0.5);
	}

    .target:hover {
        cursor: pointer;
        background-color: black;
        color: white;
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

	:global(.tooltip-enter) {
		animation: fadeIn .2s linear forwards;
	}

	:global(.tooltip-leave) {
		animation: fadeOut .2s linear forwards;
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
