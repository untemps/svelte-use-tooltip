import { DOMObserver } from '@untemps/dom-observer'

import './useTooltip.css'

const useTooltip = (node, { contentSelector, contentClone, contentActions, contentClassName, disabled }) => {
	Tooltip.init(contentSelector, contentClone)

	const tooltip = new Tooltip(node, contentActions, contentClassName)
	if (disabled) {
		tooltip.disable()
	}

	return {
		update: ({
			contentSelector: newContentSelector,
			contentClone: newContentClone,
			contentActions: newContentActions,
			contentClassName: newContentClassName,
			disabled: newDisabled,
		}) => {
			Tooltip.update(newContentSelector, newContentClone)

			tooltip.update(newContentActions, newContentClassName)
			newDisabled ? tooltip.disable() : tooltip.enable()
		},
		destroy: () => {
			tooltip.destroy()
		},
	}
}

export class Tooltip {
	static #isInitialized = false
	static #observer = null
	static #tooltip = null
	static #contentSelector = null
	static #instances = []

	#target = null
	#actions = null
	#container = null
	#events = []

	#boundEnterHandler = null
	#boundLeaveHandler = null

	constructor(target, actions, className) {
		this.#target = target
		this.#actions = actions
		this.#container = Tooltip.#tooltip

		this.#className = className

		this.#activateTarget()

		Tooltip.#instances.push(this)
	}

	static init(contentSelector, contentClone = false) {
		if (!Tooltip.#isInitialized) {
			Tooltip.#tooltip = document.createElement('div')

			Tooltip.#observer = new DOMObserver()
			Tooltip.#observer.wait(contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] }).then(({ node }) => {
				const child = contentClone ? node.cloneNode(true) : node
				Tooltip.#tooltip.appendChild(child)
			})

			Tooltip.#contentSelector = contentSelector
			Tooltip.#isInitialized = true
		}
	}

	static update(contentSelector, contentClone = false) {
		if (Tooltip.#isInitialized && contentSelector !== Tooltip.#contentSelector) {
			Tooltip.#contentSelector = contentSelector

			Tooltip.#observer.wait(contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] }).then(({ node }) => {
				Tooltip.#tooltip.innerHTML = ''
				const child = contentClone ? node.cloneNode(true) : node
				Tooltip.#tooltip.appendChild(child)
			})
		}
	}

	static destroy() {
		Tooltip.#instances.forEach((instance) => {
			instance.destroy()
		})
		Tooltip.#instances = []

		Tooltip.#tooltip?.parentNode?.removeChild(Tooltip.#tooltip)
		Tooltip.#tooltip = null

		Tooltip.#contentSelector = null

		Tooltip.#observer.clear()
		Tooltip.#isInitialized = false
	}

	get #className() {
		return this.#container?.getAttribute('class')
	}

	set #className(value) {
		this.#container?.setAttribute('class', value || '__tooltip__default')
	}

	update(actions, className) {
		this.#actions = actions
		this.#className = className
	}

	destroy() {
		this.#deactivateTarget()
		this.#removeContainerFromTarget()
	}

	enable() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this)
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this)

		this.#target.addEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.addEventListener('mouseleave', this.#boundLeaveHandler)
	}

	disable() {
		this.#target.removeEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.removeEventListener('mouseleave', this.#boundLeaveHandler)

		this.#boundEnterHandler = null
		this.#boundLeaveHandler = null
	}

	#activateTarget() {
		this.#target.title = ''
		this.#target.setAttribute('style', 'position: relative')

		this.enable()
	}

	#deactivateTarget() {
		this.disable()
	}

	#appendContainerToTarget() {
		this.#target.appendChild(this.#container)

		if (this.#actions) {
			Object.entries(this.#actions).forEach(([key, { eventType, callback, callbackParams, closeOnCallback }]) => {
				const trigger = key === '*' ? this.#container : this.#container.querySelector(key)
				if (trigger) {
					const listener = (event) => {
						callback?.apply(null, [...callbackParams, event])
						if(closeOnCallback) {
							this.#removeContainerFromTarget()
						}
					}
					trigger.addEventListener(eventType, listener)
					this.#events.push({ trigger, eventType, listener })
				}
			})
		}
	}

	#removeContainerFromTarget() {
		if (this.#target.contains(this.#container)) {
			this.#target.removeChild(this.#container)
		}

		this.#events.forEach(({ trigger, eventType, listener }) => trigger.removeEventListener(eventType, listener))
		this.#events = []
	}

	#onTargetEnter() {
		this.#appendContainerToTarget()

		Tooltip.#observer.wait(`.${this.#className}`, null, { events: [DOMObserver.EXIST] }).then(({ node }) => {
			const { width: targetWidth } = this.#target.getBoundingClientRect()
			const { width: tooltipWidth, height: tooltipHeight } = this.#container.getBoundingClientRect()
			this.#container.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
			this.#container.style.top = `${-tooltipHeight - 6}px`
		})
	}

	#onTargetLeave() {
		this.#removeContainerFromTarget()
	}
}

export default useTooltip
