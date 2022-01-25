import { DOMObserver } from '@untemps/dom-observer'

import './useTooltip.css'

const useTooltip = (node, { position, contentSelector, contentClone, contentActions, contentClassName, animated, animationEnterClassName, animationLeaveClassName, disabled }) => {
	Tooltip.init(contentSelector, contentClone)

	const tooltip = new Tooltip(node, position, disabled, contentActions, contentClassName, animated, animationEnterClassName, animationLeaveClassName)

	return {
		update: ({
			position: newPosition,
			contentSelector: newContentSelector,
			contentClone: newContentClone,
			contentActions: newContentActions,
			contentClassName: newContentClassName,
			disabled: newDisabled,
			animated: newAnimated,
			animationEnterClassName: newAnimationEnterClassName,
			animationLeaveClassName: newAnimationLeaveClassName,
		}) => {
			Tooltip.update(newContentSelector, newContentClone)

			tooltip.update(newPosition, newDisabled, newContentActions, newContentClassName, newAnimated, newAnimationEnterClassName, newAnimationLeaveClassName)
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
	#position = null
	#actions = null
	#animated = false
	#animationEnterClassName = null
	#animationLeaveClassName = null
	#container = null
	#events = []

	#boundEnterHandler = null
	#boundLeaveHandler = null

	constructor(target, position, disabled, actions, className, animated, animationEnterClassName, animationLeaveClassName) {
		this.#target = target
		this.#position = position
		this.#actions = actions
		this.#container = Tooltip.#tooltip
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		
		this.#container?.setAttribute('class', className || `__tooltip__default __tooltip__${this.#position}`)
		
		disabled ? this.#disable() : this.#enable()
		
		this.#target.title = ''
		this.#target.setAttribute('style', 'position: relative')

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

	update(position, disabled, actions, className, animated, animationEnterClassName, animationLeaveClassName) {
		this.#position = position
		this.#actions = actions
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		
		this.#container?.setAttribute('class', className || `__tooltip __tooltip__${this.#position}`)
		
		if(!disabled && !this.#boundEnterHandler) {
			this.#enable()
		} else if(disabled && !!this.#boundEnterHandler) {
			this.#disable()
		}
	}

	destroy() {
		this.#removeContainerFromTarget()
		
		this.#disable()
	}
	
	#enable() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this)
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this)
		
		this.#target.addEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.addEventListener('mouseleave', this.#boundLeaveHandler)
	}
	
	#disable() {
		this.#target.removeEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.removeEventListener('mouseleave', this.#boundLeaveHandler)
		
		this.#boundEnterHandler = null
		this.#boundLeaveHandler = null
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
					classToAdd = this.#animationEnterClassName
					classToRemove = this.#animationLeaveClassName
					break
				}
				default: {
					classToAdd = this.#animationLeaveClassName
					classToRemove = this.#animationEnterClassName
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
			const { width: targetWidth, height: targetHeight } = this.#target.getBoundingClientRect()
			const { width: tooltipWidth, height: tooltipHeight } = this.#container.getBoundingClientRect()
			switch(this.#position) {
				case 'left': {
					this.#container.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
					this.#container.style.bottom = null
					this.#container.style.left = `${-tooltipWidth - 6}px`
					this.#container.style.right = null
					break
				}
				case 'right': {
					this.#container.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
					this.#container.style.bottom = null
					this.#container.style.right = `${-tooltipWidth - 6}px`
					this.#container.style.left = null
					break
				}
				case 'bottom': {
					this.#container.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
					this.#container.style.right = null
					this.#container.style.bottom = `${-tooltipHeight - 6}px`
					this.#container.style.top = null
					break
				}
				default: {
					this.#container.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
					this.#container.style.right = null
					this.#container.style.top = `${-tooltipHeight - 6}px`
					this.#container.style.bottom = null
				}
			}
		})
	}

	async #onTargetLeave() {
		await this.#removeContainerFromTarget()
	}
}

export default useTooltip
