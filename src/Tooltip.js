import { DOMObserver } from '@untemps/dom-observer'

class Tooltip {
	static #instances = []

	#tooltip = null

	#target = null
	#content = null
	#contentSelector = null
	#contentActions = null
	#containerClassName = null
	#position = null
	#animated = false
	#animationEnterClassName = null
	#animationLeaveClassName = null
	#enterDelay = 0
	#leaveDelay = 0
	#offset = 10

	#observer = null
	#events = []
	#delay = null
	#transitioning = false

	#boundEnterHandler = null
	#boundLeaveHandler = null
	#boundWindowChangeHandler = null

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

		disabled ? this.#disable() : this.#enable()

		Tooltip.#instances.push(this)
	}

	update(
		content,
		contentSelector,
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
		const hasContentChanged =
			(contentSelector !== undefined && contentSelector !== this.#contentSelector) ||
			(content !== undefined && content !== this.#content)
		const hasContainerClassNameChanged =
			containerClassName !== undefined && containerClassName !== this.#containerClassName
		const hasPositionChanged = position !== undefined && position !== this.#position
		const hasOffsetChanged = offset !== undefined && offset !== this.#offset
		const hasToDisableTarget = disabled && this.#boundEnterHandler
		const hasToEnableTarget = !disabled && !this.#boundEnterHandler

		this.#content = content
		this.#contentSelector = contentSelector
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
			this.#disable()
		} else if (hasToEnableTarget) {
			this.#enable()
		}
	}

	async destroy() {
		await this.#removeTooltipFromTarget()

		this.#disableTarget()

		this.#clearDelay()

		this.#observer?.clear()
		this.#observer = null
	}

	#enable() {
		this.#enableTarget()
		this.#enableWindow()
	}

	#enableTarget() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this)
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this)

		this.#target.addEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.addEventListener('mouseleave', this.#boundLeaveHandler)
		this.#target.addEventListener('focusin', this.#boundEnterHandler)
		this.#target.addEventListener('focusout', this.#boundLeaveHandler)
	}

	#enableWindow() {
		this.#boundWindowChangeHandler = this.#onWindowChange.bind(this)

		window.addEventListener('keydown', this.#boundWindowChangeHandler)
		window.addEventListener('resize', this.#boundWindowChangeHandler)
		window.addEventListener('scroll', this.#boundWindowChangeHandler)
	}

	#disable() {
		this.#disableTarget()
		this.#disableWindow()
	}

	#disableTarget() {
		this.#target.removeEventListener('mouseenter', this.#boundEnterHandler)
		this.#target.removeEventListener('mouseleave', this.#boundLeaveHandler)
		this.#target.removeEventListener('focusin', this.#boundEnterHandler)
		this.#target.removeEventListener('focusout', this.#boundLeaveHandler)

		this.#boundEnterHandler = null
		this.#boundLeaveHandler = null
	}

	#disableWindow() {
		window.removeEventListener('keydown', this.#boundWindowChangeHandler)
		window.removeEventListener('resize', this.#boundWindowChangeHandler)
		window.removeEventListener('scroll', this.#boundWindowChangeHandler)

		this.#boundWindowChangeHandler = null
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
					const child = node.content ? node.content.firstElementChild : node
					child.setAttribute('style', 'position: relative')
					this.#tooltip.appendChild(child.cloneNode(true))
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

		this.#observer.wait(this.#tooltip, null, { events: [DOMObserver.ADD] }).then(({ node }) => {
			this.#positionTooltip()
		})
		this.#target.appendChild(this.#tooltip)

		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(
				([key, { eventType, callback, callbackParams, closeOnCallback }], i) => {
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

						if (i === 0) trigger.focus()
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
			switch (direction) {
				case 1: {
					this.#tooltip.classList.add(this.#animationEnterClassName)
					this.#tooltip.classList.remove(this.#animationLeaveClassName)
					this.#transitioning = false
					resolve()
					break
				}
				default: {
					const onTransitionEnd = () => {
						this.#tooltip.removeEventListener('animationend', onTransitionEnd)
						this.#tooltip.classList.remove(this.#animationLeaveClassName)
						if (this.#transitioning) {
							this.#transitioning = false
							resolve()
						}
					}

					if (!this.#transitioning) {
						this.#tooltip.addEventListener('animationend', onTransitionEnd)
						this.#tooltip.classList.add(this.#animationLeaveClassName)
						this.#tooltip.classList.remove(this.#animationEnterClassName)
						this.#transitioning = true
					}
				}
			}
		})
	}

	async #onTargetEnter(e) {
		if (this.#target === e.target) {
			await this.#waitForDelay(this.#enterDelay)
			await this.#appendTooltipToTarget()
		}
	}

	async #onTargetLeave(e) {
		if (this.#target === e.target || !this.#target.contains(e.target)) {
			await this.#waitForDelay(this.#leaveDelay)
			await this.#removeTooltipFromTarget()
		}
	}

	async #onWindowChange(e) {
		if (
			this.#tooltip &&
			this.#tooltip.parentNode &&
			(e.type !== 'keydown' ||
				(e.type === 'keydown' && e.key === 'Escape') ||
				e.key === 'Esc' ||
				e.keyCode === 27)
		) {
			await this.#removeTooltipFromTarget()
		}
	}
}

export default Tooltip
