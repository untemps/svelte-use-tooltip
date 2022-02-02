<script>
	import {useTooltip} from '@untemps/svelte-use-tooltip'

    let settingsVisibility = 'hidden'

	let tooltipTextContent = null
	let useCustomTooltipClass = false
	let tooltipPosition = 'top'
	let isTooltipDisabled = false
	let animateTooltip = false
	let useCustomAnimationEnterClass = false
	let useCustomAnimationLeaveClass = false
	let tooltipEnterDelay = 200
	let tooltipLeaveDelay = 200
	let tooltipOffset = 10

	const _onTooltipClick = (arg, e) => {
		e.preventDefault()
		alert('You\'ve clicked a interactive element within the tooltip')
	}

	const _onSettingsOpenClick = () => {
		settingsVisibility = 'visible'
    }

	const _onSettingsCloseClick = () => {
		settingsVisibility = 'hidden'
    }
</script>

<main>
    <div class="container">
        <div
                use:useTooltip={{
				position: tooltipPosition,
				content: tooltipTextContent,
				contentSelector: !tooltipTextContent?.length ? '#tooltip-content' : null,
				contentClone: true,
				contentActions: {
					'.tooltip__button': {
						eventType: 'click',
						callback: _onTooltipClick,
						callbackParams: ['ok'],
						closeOnCallback: false,
					},
				},
				containerClassName: useCustomTooltipClass ? `tooltip tooltip-${tooltipPosition}` : null,
				animated: animateTooltip,
				animationEnterClassName: useCustomAnimationEnterClass ? 'tooltip-enter' : null,
				animationLeaveClassName: useCustomAnimationLeaveClass ? 'tooltip-leave' : null,
				enterDelay: tooltipEnterDelay,
				leaveDelay: tooltipLeaveDelay,
				offset: tooltipOffset,
				disabled: isTooltipDisabled
			}}
                class="target"
        >
            Hover me
        </div>
        <button class="container__settings-open" on:click={_onSettingsOpenClick}>Settings</button>
        <div class="settings__container" style="--settingsVisibility:{settingsVisibility}">
            <button class="settings__settings-close" on:click={_onSettingsCloseClick}>Close</button>
            <form class="settings__form">
                <h1>Settings</h1>
                <fieldset>
                    <label for="tooltip-content">
                        Default Tooltip Content:
                        <span id="tooltip-content" class="tooltip__content">
                            <span class="tooltip__text">Hi! I'm a <i>fancy</i> <strong>tooltip</strong>!</span>
                            <button type="button" class="tooltip__button">Click me</button>
                        </span>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Tooltip Text Content:
                        <input type="text" bind:value={tooltipTextContent}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Tooltip Class:
                        <input type="checkbox" bind:checked={useCustomTooltipClass}/>
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
                        <input type="checkbox" bind:checked={animateTooltip}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Tooltip Animation Enter Class:
                        <input type="checkbox" bind:checked={useCustomAnimationEnterClass}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Tooltip Animation Leave Class:
                        <input type="checkbox" bind:checked={useCustomAnimationLeaveClass}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Tooltip Enter Delay (ms):
                        <input type="number" step={100} min={0} bind:value={tooltipEnterDelay}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Tooltip Leave Delay (ms):
                        <input type="number" step={100} min={0} bind:value={tooltipLeaveDelay}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Tooltip Offset (px):
                        <input type="number" step={1} min={5} bind:value={tooltipOffset}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Disable Tooltip:
                        <input type="checkbox" bind:checked={isTooltipDisabled}/>
                    </label>
                </fieldset>
            </form>
        </div>
    </div>
</main>

<style>
    main {
        position: relative;
        display: flex;
        justify-content: center;
        height: 100%;
        padding: 1rem;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        row-gap: 3rem;
    }

    .container__settings-open {
        position: absolute;
        bottom: 1rem;
    }

    @media screen and (min-width: 576px) {
        .container__settings-open {
            display: none;
        }
    }

    .settings__container {
        position: absolute;
        top: 0;
        left: 0;
        overflow: hidden auto;
        height: 100%;
        background-color: #eee;
        visibility: var(--settingsVisibility);
    }

    @media screen and (min-width: 576px) {
        .settings__container {
            position: relative;
            height: auto;
            visibility: visible;
        }
    }

    .settings__settings-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
    }

    @media screen and (min-width: 576px) {
        .settings__settings-close {
            display: none;
        }
    }

    .settings__form {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        padding: 1rem;}

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
        width: 6rem;
        margin: 0;
    }

    .settings__form input[type='checkbox'] {
        padding: 0;
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
        display: flex;
        column-gap: .5rem;
        align-items: center;
    }

    .tooltip__text {
        background-color: yellow;
        color: black;
    }

    .tooltip__button {
        margin: 0;
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
</style>
