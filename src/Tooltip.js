import { DOMObserver } from '@untemps/dom-observer'

class Tooltip {
	static get GAP() {
		return 10
	}

	static #instances = []

	#observer = null
	#events = []

	#tooltip = null

	#boundEnterHandler = null
	#boundLeaveHandler = null

	#target = null
	#content = null
	#contentSelector = null
	#contentActions = null
	#contentClone = false
	#containerClassName = null
	#position = null
	#animated = false
	#animationEnterClassName = null
	#animationLeaveClassName = null

	static destroy() {
		Tooltip.#instances.forEach((instance) => {
			instance.destroy()
		})
		Tooltip.#instances = []
	}

	constructor(
		target,
		content,
		contentSelector,
		contentClone,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		disabled
	) {
		this.#target = target
		this.#content = content
		this.#contentSelector = contentSelector
		this.#contentActions = contentActions
		this.#contentClone = contentClone
		this.#containerClassName = containerClassName
		this.#position = position
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'

		this.#observer = new DOMObserver()

		this.#target.title = ''
		this.#target.setAttribute('style', 'position: relative')

		this.#createTooltip()

		disabled ? this.#disableTarget() : this.#enableTarget()

		Tooltip.#instances.push(this)
	}

	update(
		content,
		contentSelector,
		contentClone,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		disabled
	) {
		const hasContentChanged = contentSelector !== this.#contentSelector || content !== this.#content
		const hasContainerClassNameChanged = containerClassName !== this.#containerClassName
		const hasToDisableTarget = disabled && this.#boundEnterHandler
		const hasToEnableTarget = !disabled && !this.#boundEnterHandler

		this.#content = content
		this.#contentSelector = contentSelector
		this.#contentClone = contentClone
		this.#contentActions = contentActions
		this.#containerClassName = containerClassName
		this.#position = position
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'

		if (hasContentChanged) {
			this.#removeTooltipFromTarget()

			this.#createTooltip()
		}

		if (hasContainerClassNameChanged) {
			this.#tooltip.className = this.#containerClassName || `__tooltip __tooltip-${this.#position}`
		}

		if (hasToDisableTarget) {
			this.#disableTarget()
		} else if (hasToEnableTarget) {
			this.#enableTarget()
		}
	}

	destroy() {
		this.#removeTooltipFromTarget()

		this.#disableTarget()

		this.#observer?.clear()
		this.#observer = null
	}

	#enableTarget() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this)
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this)

		this.#target.addEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.addEventListener('mouseleave', this.#boundLeaveHandler)
	}

	#disableTarget() {
		this.#target.removeEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.removeEventListener('mouseleave', this.#boundLeaveHandler)

		this.#boundEnterHandler = null
		this.#boundLeaveHandler = null
	}

	#createTooltip() {
		this.#tooltip = document.createElement('div')
		this.#tooltip.className = this.#containerClassName || `__tooltip __tooltip-${this.#position}`

		if (this.#contentSelector) {
			this.#observer
				.wait(this.#contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] })
				.then(({ node }) => {
					const child = this.#contentClone ? node.cloneNode(true) : node
					this.#tooltip.appendChild(child)
				})
		} else if (this.#content) {
			const child = document.createTextNode(this.#content)
			this.#tooltip.appendChild(child)
		}
	}

	#positionTooltip() {
		const { width: targetWidth, height: targetHeight } = this.#target.getBoundingClientRect()
		const { width: tooltipWidth, height: tooltipHeight } = this.#tooltip.getBoundingClientRect()
		switch (this.#position) {
			case 'left': {
				this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
				this.#tooltip.style.left = `${-tooltipWidth - Tooltip.GAP}px`
				this.#tooltip.style.bottom = null
				this.#tooltip.style.right = null
				break
			}
			case 'right': {
				this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
				this.#tooltip.style.right = `${-tooltipWidth - Tooltip.GAP}px`
				this.#tooltip.style.bottom = null
				this.#tooltip.style.left = null
				break
			}
			case 'bottom': {
				this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
				this.#tooltip.style.bottom = `${-tooltipHeight - Tooltip.GAP}px`
				this.#tooltip.style.right = null
				this.#tooltip.style.top = null
				break
			}
			default: {
				this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
				this.#tooltip.style.top = `${-tooltipHeight - Tooltip.GAP}px`
				this.#tooltip.style.right = null
				this.#tooltip.style.bottom = null
			}
		}
	}

	async #appendTooltipToTarget() {
		if (this.#animated) {
			await this.#transitionTooltip(1)
		}

		this.#target.appendChild(this.#tooltip)
		this.#observer.wait(this.#tooltip, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] }).then(() => {
			this.#positionTooltip()
		})

		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(
				([key, { eventType, callback, callbackParams, closeOnCallback }]) => {
					const trigger = key === '*' ? this.#tooltip : this.#tooltip.querySelector(key)
					if (trigger) {
						const listener = (event) => {
							callback?.apply(null, [...callbackParams, event])
							if (closeOnCallback) {
								this.#removeTooltipFromTarget()
							}
						}
						trigger.addEventListener(eventType, listener)
						this.#events.push({ trigger, eventType, listener })
					}
				}
			)
		}
	}

	async #removeTooltipFromTarget() {
		if (this.#animated) {
			await this.#transitionTooltip(0)
		}

		this.#tooltip.remove()

		this.#events.forEach(({ trigger, eventType, listener }) => trigger.removeEventListener(eventType, listener))
		this.#events = []
	}

	#transitionTooltip(direction) {
		return new Promise((resolve) => {
			let classToAdd, classToRemove
			switch (direction) {
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
			this.#tooltip.classList.add(classToAdd)
			this.#tooltip.classList.remove(classToRemove)

			if (direction === 1) {
				resolve()
			}

			const onTransitionEnd = () => {
				this.#tooltip.removeEventListener('animationend', onTransitionEnd)
				this.#tooltip.classList.remove(classToAdd)
				resolve()
			}
			this.#tooltip.addEventListener('animationend', onTransitionEnd)
		})
	}

	async #onTargetEnter() {
		await this.#appendTooltipToTarget()
	}

	async #onTargetLeave() {
		await this.#removeTooltipFromTarget()
	}
}

export default Tooltip
