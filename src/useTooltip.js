import { DOMObserver } from '@untemps/dom-observer'

import './useTooltip.css'

const useTooltip = (node, { contentSelector, contentClone, contentActions, containerClassName, disabled, animated }) => {
	Tooltip.init(contentSelector, contentClone)

	const tooltip = new Tooltip(node, contentActions, containerClassName, animated)
	if (disabled) {
		tooltip.disable()
	}

	return {
		update: ({
			contentSelector: newContentSelector,
			contentClone: newContentClone,
			contentActions: newContentActions,
			containerClassName: newContainerClassName,
			disabled: newDisabled,
			animated: newAnimated,
		}) => {
			Tooltip.update(newContentSelector, newContentClone)

			tooltip.update(newContentActions, newContainerClassName, newAnimated)
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
	#animated = false
	#container = null
	#events = []

	#boundEnterHandler = null
	#boundLeaveHandler = null

	constructor(target, actions, className, animated) {
		this.#target = target
		this.#actions = actions
		this.#container = Tooltip.#tooltip
		this.#animated = animated

		this.#className = className

		this.#activateTarget()

		Tooltip.#instances.push(this)
	}

	static init(contentSelector, contentClone = false) {
		if (!Tooltip.#isInitialized) {
			Tooltip.#tooltip = document.createElement('div')
			Tooltip.#tooltip.id = 'tooltip'

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

	update(actions, className, animated) {
		this.#actions = actions
		this.#className = className
		this.#animated = animated
	}

	destroy() {
		this.#deactivateTarget()
		this.#removeContainerFromTarget();
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

	async #appendContainerToTarget() {
		if(this.#animated) {
			await this.#manageTransition(1)
		}

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

	async #removeContainerFromTarget() {
		if(this.#animated) {
			await this.#manageTransition(0)
		}

		this.#container.remove()

		this.#events.forEach(({ trigger, eventType, listener }) => trigger.removeEventListener(eventType, listener))
		this.#events = []
	}

	#manageTransition(direction) {
		return new Promise((resolve) => {
			let classToAdd, classToRemove
			switch(direction) {
				case 1: {
					classToAdd = '__tooltip__show'
					classToRemove = '__tooltip__hide'
					break
				}
				default: {
					classToAdd = '__tooltip__hide'
					classToRemove = '__tooltip__show'
				}
			}
			this.#container.classList.add(classToAdd)
			this.#container.classList.remove(classToRemove)

			if(direction === 1) {
				resolve()
			}

			const onTransitionEnd = () => {
				this.#container.removeEventListener("animationend", onTransitionEnd)
				this.#container.classList.remove(classToAdd)
				resolve()
			}
			this.#container.addEventListener("animationend", onTransitionEnd)
		})
	}

	async #onTargetEnter() {
		await this.#appendContainerToTarget()

		Tooltip.#observer.wait(`#tooltip`, null, { events: [DOMObserver.EXIST] }).then(({ node }) => {
			const { width: targetWidth } = this.#target.getBoundingClientRect()
			const { width: tooltipWidth, height: tooltipHeight } = this.#container.getBoundingClientRect()
			this.#container.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
			this.#container.style.top = `${-tooltipHeight - 6}px`
		})
	}

	async #onTargetLeave() {
		await this.#removeContainerFromTarget()
	}
}

export default useTooltip
