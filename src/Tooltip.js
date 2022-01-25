import {DOMObserver} from '@untemps/dom-observer'

class Tooltip {
	static #instances = []
	static get GAP() {
		return 10
	}
	
	#observer = null
	
	#tooltip = null
	
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
	
	#events = []
	
	#boundEnterHandler = null
	#boundLeaveHandler = null
	
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
		this.#position = position
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		
		this.#target.title = ''
		this.#target.setAttribute('style', 'position: relative')
		
		this.#tooltip = document.createElement('div')
		this.#tooltip.id = 'tooltip'
		
		this.#observer = new DOMObserver()
		if(this.#contentSelector) {
			this.#observer
				.wait(this.#contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] })
				.then(({ node }) => {
					const child = this.#contentClone ? node.cloneNode(true) : node
					this.#tooltip.appendChild(child)
				})
		}
		
		this.#tooltip?.setAttribute('class', this.#containerClassName || `__tooltip __tooltip-${this.#position}`)
		
		disabled ? this.#disable() : this.#enable()
		
		Tooltip.#instances.push(this)
	}
	
	static destroy() {
		Tooltip.#instances.forEach((instance) => {
			instance.destroy()
		})
		Tooltip.#instances = []
	}
	
	update(content, contentSelector, contentClone, contentActions, containerClassName, position, animated, animationEnterClassName, animationLeaveClassName, disabled) {
		this.#content = content
		this.#contentSelector = contentSelector
		this.#contentClone = contentClone
		this.#contentActions = contentActions
		this.#containerClassName = containerClassName
		this.#position = position
		this.#animated = animated
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter'
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave'
		
		this.#observer
			.wait(this.#contentSelector, null, { events: [DOMObserver.EXIST, DOMObserver.ADD] })
			.then(({ node }) => {
				this.#tooltip.innerHTML = ''
				const child = this.#contentClone ? node.cloneNode(true) : node
				this.#tooltip.appendChild(child)
			})
		
		this.#tooltip?.setAttribute('class', this.#containerClassName || `__tooltip __tooltip-${this.#position}`)
		
		if (!disabled && !this.#boundEnterHandler) {
			this.#enable()
		} else if (disabled && !!this.#boundEnterHandler) {
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
		if (this.#animated) {
			await this.#manageTransition(1)
		}
		
		this.#target.appendChild(this.#tooltip)
		
		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(([key, { eventType, callback, callbackParams, closeOnCallback }]) => {
				const trigger = key === '*' ? this.#tooltip : this.#tooltip.querySelector(key)
				if (trigger) {
					const listener = (event) => {
						callback?.apply(null, [...callbackParams, event])
						if (closeOnCallback) {
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
		if (this.#animated) {
			await this.#manageTransition(0)
		}
		
		this.#tooltip.remove()
		
		this.#events.forEach(({ trigger, eventType, listener }) => trigger.removeEventListener(eventType, listener))
		this.#events = []
	}
	
	#manageTransition(direction) {
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
		console.log('ok')
		await this.#appendContainerToTarget()
		
		this.#observer.wait(`#tooltip`, null, { events: [DOMObserver.EXIST] }).then(({ node }) => {
			const { width: targetWidth, height: targetHeight } = this.#target.getBoundingClientRect()
			const { width: tooltipWidth, height: tooltipHeight } = this.#tooltip.getBoundingClientRect()
			switch (this.#position) {
				case 'left': {
					this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
					this.#tooltip.style.bottom = null
					this.#tooltip.style.left = `${-tooltipWidth - Tooltip.GAP}px`
					this.#tooltip.style.right = null
					break
				}
				case 'right': {
					this.#tooltip.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`
					this.#tooltip.style.bottom = null
					this.#tooltip.style.right = `${-tooltipWidth - Tooltip.GAP}px`
					this.#tooltip.style.left = null
					break
				}
				case 'bottom': {
					this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
					this.#tooltip.style.right = null
					this.#tooltip.style.bottom = `${-tooltipHeight - Tooltip.GAP}px`
					this.#tooltip.style.top = null
					break
				}
				default: {
					this.#tooltip.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`
					this.#tooltip.style.right = null
					this.#tooltip.style.top = `${-tooltipHeight - Tooltip.GAP}px`
					this.#tooltip.style.bottom = null
				}
			}
		})
	}
	
	async #onTargetLeave() {
		await this.#removeContainerFromTarget()
	}
}

export default Tooltip