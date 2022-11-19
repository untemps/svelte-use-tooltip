<script>
	import {useTooltip} from '../../src'

	import SettingsIcon from './SettingsIcon.svelte'
	import CloseIcon from './CloseIcon.svelte'

	let showSettings = false

	let textContent = null
	let useCustomClass = false
	let position = 'top'
	let isDisabled = false
	let animate = false
	let useCustomAnimationEnterClass = false
	let useCustomAnimationLeaveClass = false
	let enterDelay = 200
	let leaveDelay = 200
	let triggerOnEnter = false
	let triggerOnLeave = false
	let offset = 10

	const _onTooltipEnter = () => {
		if(triggerOnEnter) {
		    alert('You\'ve entered the target')
		}
	}

	const _onTooltipLeave = () => {
		if(triggerOnLeave) {
			alert('You\'ve left the target')
		}
	}

	const _onTooltipClick = (arg, e) => {
		e.preventDefault()
		alert('You\'ve clicked the tooltip')
	}
</script>

<style>
    main {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        padding: 1rem;
        background-color: #617899;
    }

    .toggle__button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        width: 36px;
    }

    .container {
        position: relative;
        max-width: 640px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .settings__container {
        overflow: hidden auto;
        position: absolute;
        z-index: 9999;
        max-width: 480px;
        margin: 0 1rem;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    @media screen and (max-height: 700px) {
        .settings__container {
            max-height: calc(100vh - 40px);
        }
    }

    .settings__form {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        background-color: #fafafa;
        border-radius: 1rem;
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
        max-width: 100px;
    }

    .settings__form input[type='checkbox'] {
        padding: 0;
    }

    .target {
        width: 10rem;
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
        column-gap: .5rem;
        align-items: center;
    }

    :global(.tooltip) {
        position: absolute;
        z-index: 9999;
        max-width: 140px;
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

<template id="tooltip__template">
    <span class="tooltip__content">Hi! I'm a <i>fancy</i> <strong>tooltip</strong>!</span>
</template>
<main>
    {#if showSettings}
        <div class="settings__container">
            <button type="button" class="toggle__button" on:click={() => (showSettings = !showSettings)}>
                <CloseIcon color="#fff" />
            </button>
            <form class="settings__form">
                <fieldset>
                    <label>
                        Text Content:
                        <input type="text" bind:value={textContent}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Class:
                        <input type="checkbox" bind:checked={useCustomClass}/>
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
                        <input type="checkbox" bind:checked={animate}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Animation Enter Class:
                        <input type="checkbox" bind:checked={useCustomAnimationEnterClass}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Use Custom Animation Leave Class:
                        <input type="checkbox" bind:checked={useCustomAnimationLeaveClass}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Enter Delay (ms):
                        <input type="number" step={100} min={0} bind:value={enterDelay}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Leave Delay (ms):
                        <input type="number" step={100} min={0} bind:value={leaveDelay}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Trigger callback on enter:
                        <input type="checkbox" bind:checked={triggerOnEnter}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Trigger callback on leave:
                        <input type="checkbox" bind:checked={triggerOnLeave}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Offset (px):
                        <input type="number" step={1} min={5} bind:value={offset}/>
                    </label>
                </fieldset>
                <fieldset>
                    <label>
                        Disable:
                        <input type="checkbox" bind:checked={isDisabled}/>
                    </label>
                </fieldset>
            </form>
        </div>
    {/if}
    <div class="container">
        <button type="button" class="toggle__button" on:click={() => (showSettings = !showSettings)}>
            <SettingsIcon color="#fff" />
        </button>
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
						closeOnCallback: true,
					},
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
				disabled: isDisabled,
			}}
                class="target"
        >
            Hover me
        </div>
    </div>
</main>