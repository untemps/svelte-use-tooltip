import { DOMObserver } from '@untemps/dom-observer'

class Tooltip {
	static #instances = []

	#observer = null
	#events = []
	#enterDelay = 0
	#leaveDelay = 0
	#delay = null

	#tooltip = null

	#boundEnterHandler = null
	#boundLeaveHandler = null
	#boundKeyDownHandler = null

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
	#offset = 10

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
		enterDelay,
		leaveDelay,
		offset,
		disabled
	) {
		this.#target = target
		this.#content = content
		this.#contentSelector = contentSelector
		this.#contentClone = contentClone || false
		this.#contentActions = contentActions
		this.#containerClassName = containerClassName
		this.#position = position || 'top'
		this.#animated = animated || false
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		this.#enterDelay = enterDelay || 0
		this.#leaveDelay = leaveDelay || 0
		this.#offset = Math.max(offset || 10, 5)

		this.#observer = new DOMObserver()

		this.#createTooltip()

		this.#target.title = ''
		this.#target.setAttribute('style', 'position: relative')
		this.#target.setAttribute('aria-describedby', 'tooltip')

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
		enterDelay,
		leaveDelay,
		offset,
		disabled
	) {
		const hasContentChanged = contentSelector !== this.#contentSelector || content !== this.#content
		const hasContainerClassNameChanged = containerClassName !== this.#containerClassName
		const hasPositionChanged = position !== this.#position
		const hasOffsetChanged = position !== this.#offset
		const hasToDisableTarget = disabled && this.#boundEnterHandler
		const hasToEnableTarget = !disabled && !this.#boundEnterHandler

		this.#content = content
		this.#contentSelector = contentSelector
		this.#contentClone = contentClone || false
		this.#contentActions = contentActions
		this.#containerClassName = containerClassName
		this.#position = position || 'top'
		this.#animated = animated || false
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		this.#enterDelay = enterDelay || 0
		this.#leaveDelay = leaveDelay || 0
		this.#offset = Math.max(offset || 10, 5)

		if (hasContentChanged || hasPositionChanged || hasOffsetChanged) {
			this.#removeTooltipFromTarget()
			this.#createTooltip()
		}

		if (hasContainerClassNameChanged || hasContentChanged || hasPositionChanged || hasOffsetChanged) {
			this.#tooltip.setAttribute('class', this.#containerClassName || `__tooltip __tooltip-${this.#position}`)
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

		this.#clearDelay()

		this.#observer?.clear()
		this.#observer = null
	}

	#enableTarget() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this)
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this)
		this.#boundKeyDownHandler = this.#onTargetKeyDown.bind(this)

		this.#target.addEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.addEventListener('mouseleave', this.#boundLeaveHandler)
		this.#target.addEventListener('focusin', this.#boundEnterHandler)
		this.#target.addEventListener('focusout', this.#boundLeaveHandler)
		window.addEventListener('keydown', this.#boundKeyDownHandler)
	}

	#disableTarget() {
		this.#target.removeEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.removeEventListener('mouseleave', this.#boundLeaveHandler)
		this.#target.removeEventListener('focusin', this.#boundEnterHandler)
		this.#target.removeEventListener('focusout', this.#boundLeaveHandler)
		window.removeEventListener('keydown', this.#boundKeyDownHandler)

		this.#boundEnterHandler = null
		this.#boundLeaveHandler = null
		this.#boundKeyDownHandler = null
	}

	#createTooltip() {
		this.#tooltip = document.createElement('div')
		this.#tooltip.setAttribute('id', 'tooltip')
		this.#tooltip.setAttribute('class', this.#containerClassName || `__tooltip __tooltip-${this.#position}`)
		this.#tooltip.setAttribute('role', 'tooltip')

		if (this.#contentSelector) {
			this.#observer
				.wait(this.#contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] })
				.then(({ node }) => {
					const child = this.#contentClone ? node.cloneNode(true) : node
					child.setAttribute('style', 'position: relative')
					this.#tooltip.appendChild(child)
				})
		} else if (this.#content) {
			const child = document.createTextNode(this.#content)
			this.#tooltip.appendChild(child)
		}

		this.#createAndAddTooltipArea()
	}

	#createAndAddTooltipArea() {
		const area = document.createElement('span')
		area.setAttribute('aria-hidden', 'true')
		area.setAttribute('class', '__tooltip-area')
		switch (this.#position) {
			case 'left': {
				area.setAttribute('style', `width: calc(100% + ${this.#offset}px)`)
				break
			}
			case 'right': {
				area.setAttribute(
					'style',
					`width: calc(100% + ${this.#offset}px); margin-left: calc(-0.5rem - ${this.#offset}px)`
				)
				break
			}
			case 'bottom': {
				area.setAttribute(
					'style',
					`height: calc(100% + ${this.#offset}px); margin-top: calc(-0.5rem - ${this.#offset}px)`
				)
				break
			}
			default: {
				area.setAttribute('style', `height: calc(100% + ${this.#offset}px)`)
			}
		}
		this.#tooltip.appendChild(area)
	}

	#positionTooltip() {
		const { width: targetWidth, height: targetHeight } = this.#target.getBoundingClientRect()
		const { width: tooltipWidth, height: tooltipHeight } = this.#tooltip.getBoundingClientRect()
		switch (this.#position) {
			case 'left': {
				this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
				this.#tooltip.style.left = `${-tooltipWidth - this.#offset}px`
				this.#tooltip.style.bottom = null
				this.#tooltip.style.right = null
				break
			}
			case 'right': {
				this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
				this.#tooltip.style.right = `${-tooltipWidth - this.#offset}px`
				this.#tooltip.style.bottom = null
				this.#tooltip.style.left = null
				break
			}
			case 'bottom': {
				this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
				this.#tooltip.style.bottom = `${-tooltipHeight - this.#offset}px`
				this.#tooltip.style.right = null
				this.#tooltip.style.top = null
				break
			}
			default: {
				this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
				this.#tooltip.style.top = `${-tooltipHeight - this.#offset}px`
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
							callback?.apply(null, [...(callbackParams || []), event])
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

	#waitForDelay(delay) {
		this.#clearDelay()
		return new Promise(
			(resolve) =>
				(this.#delay = setTimeout(() => {
					this.#clearDelay()
					resolve()
				}, delay))
		)
	}

	#clearDelay() {
		clearTimeout(this.#delay)
		this.#delay = null
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
		await this.#waitForDelay(this.#enterDelay)
		await this.#appendTooltipToTarget()
	}

	async #onTargetLeave() {
		await this.#waitForDelay(this.#leaveDelay)
		await this.#removeTooltipFromTarget()
	}

	async #onTargetKeyDown(e) {
		if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
			await this.#onTargetLeave()
		}
	}
}

export default Tooltip
