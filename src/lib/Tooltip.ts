import { DOMObserver, type WaitResult } from '@untemps/dom-observer';
import { standby } from '@untemps/utils/async/standby';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type ContentAction = {
	eventType: string;
	callback: (...args: unknown[]) => void;
	callbackParams?: unknown[];
	closeOnCallback?: boolean;
};

export type ContentActions = Record<string, ContentAction>;

type SpaceMap = Record<TooltipPosition, number>;
type PlacementResult = { position: TooltipPosition; adaptedWidth: string | null };
type EventRecord = { trigger: Element; eventType: string; listener: EventListener };
type ChangeSet = {
	hasStructureChanged: boolean;
	hasContainerClassNameChanged: boolean;
	hasWidthChanged: boolean;
	hasToDisableTarget: boolean;
	hasToEnableTarget: boolean;
};

class Tooltip {
	static #instances: Tooltip[] = [];
	// Minimum width (px) a horizontal position must offer before width-adaptation is attempted.
	// Below this threshold the tooltip switches to a different position instead.
	static #MIN_WIDTH = 80;

	#tooltip: HTMLDivElement | null = null;

	#target: HTMLElement | null = null;
	#content: string | null = null;
	#contentSelector: string | null = null;
	#contentActions: ContentActions | null = null;
	#containerClassName: string | null = null;
	#position: TooltipPosition = 'top';
	#animated = false;
	#animationEnterClassName: string | null = null;
	#animationLeaveClassName: string | null = null;
	#enterDelay = 0;
	#leaveDelay = 0;
	#onEnter: (() => void) | null = null;
	#onLeave: (() => void) | null = null;
	#offset = 10;
	#width = 'auto';

	#observer: DOMObserver | null = null;
	#events: EventRecord[] = [];
	#delay: ReturnType<typeof setTimeout> | undefined;
	#transitioning = false;

	#boundEnterHandler: ((e: Event) => void) | null = null;
	#boundLeaveHandler: ((e: Event) => void) | null = null;
	#boundWindowChangeHandler: ((e: Event) => void) | null = null;

	static destroy() {
		Tooltip.#instances.forEach((instance) => {
			instance.destroy();
		});
		Tooltip.#instances = [];
	}

	constructor(
		target: HTMLElement,
		content: string | null | undefined,
		contentSelector: string | null | undefined,
		contentActions: ContentActions | null | undefined,
		containerClassName: string | null | undefined,
		position: TooltipPosition | undefined,
		animated: boolean | undefined,
		animationEnterClassName: string | null | undefined,
		animationLeaveClassName: string | null | undefined,
		enterDelay: number | undefined,
		leaveDelay: number | undefined,
		onEnter: (() => void) | null | undefined,
		onLeave: (() => void) | null | undefined,
		offset: number | undefined,
		width: string | undefined,
		disabled: boolean | undefined
	) {
		this.#target = target;
		this.#content = content ?? null;
		this.#contentSelector = contentSelector ?? null;
		this.#contentActions = contentActions ?? null;
		this.#containerClassName = containerClassName ?? null;
		this.#position = position ?? 'top';
		this.#animated = animated ?? false;
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter';
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave';
		this.#enterDelay = enterDelay ?? 0;
		this.#leaveDelay = leaveDelay ?? 0;
		this.#onEnter = onEnter ?? null;
		this.#onLeave = onLeave ?? null;
		this.#offset = Math.max(offset ?? 10, 5);
		this.#width = width ?? 'auto';

		this.#observer = new DOMObserver();

		this.#createTooltip();

		this.#target.title = '';
		this.#target.style.position = 'relative';
		this.#target.setAttribute('aria-describedby', 'tooltip');

		disabled ? this.#disable() : this.#enable();

		Tooltip.#instances.push(this);
	}

	update(
		content: string | null | undefined,
		contentSelector: string | null | undefined,
		contentActions: ContentActions | null | undefined,
		containerClassName: string | null | undefined,
		position: TooltipPosition | undefined,
		animated: boolean | undefined,
		animationEnterClassName: string | null | undefined,
		animationLeaveClassName: string | null | undefined,
		enterDelay: number | undefined,
		leaveDelay: number | undefined,
		onEnter: (() => void) | null | undefined,
		onLeave: (() => void) | null | undefined,
		offset: number | undefined,
		width: string | undefined,
		disabled: boolean | undefined
	) {
		const changes = this.#detectChanges(
			content,
			contentSelector,
			containerClassName,
			position,
			offset,
			width,
			disabled
		);
		this.#applyState(
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
			onEnter,
			onLeave,
			offset,
			width
		);
		this.#applyChanges(changes);
	}

	#detectChanges(
		content: string | null | undefined,
		contentSelector: string | null | undefined,
		containerClassName: string | null | undefined,
		position: TooltipPosition | undefined,
		offset: number | undefined,
		width: string | undefined,
		disabled: boolean | undefined
	): ChangeSet {
		const hasContentChanged =
			(contentSelector !== undefined && contentSelector !== this.#contentSelector) ||
			(content !== undefined && content !== this.#content);
		const hasStructureChanged =
			hasContentChanged ||
			(position !== undefined && position !== this.#position) ||
			(offset !== undefined && offset !== this.#offset);
		return {
			hasStructureChanged,
			hasContainerClassNameChanged:
				containerClassName !== undefined && containerClassName !== this.#containerClassName,
			hasWidthChanged: width !== undefined && width !== this.#width,
			hasToDisableTarget: !!disabled && Boolean(this.#boundEnterHandler),
			hasToEnableTarget: !disabled && !Boolean(this.#boundEnterHandler)
		};
	}

	#applyState(
		content: string | null | undefined,
		contentSelector: string | null | undefined,
		contentActions: ContentActions | null | undefined,
		containerClassName: string | null | undefined,
		position: TooltipPosition | undefined,
		animated: boolean | undefined,
		animationEnterClassName: string | null | undefined,
		animationLeaveClassName: string | null | undefined,
		enterDelay: number | undefined,
		leaveDelay: number | undefined,
		onEnter: (() => void) | null | undefined,
		onLeave: (() => void) | null | undefined,
		offset: number | undefined,
		width: string | undefined
	) {
		this.#content = content ?? null;
		this.#contentSelector = contentSelector ?? null;
		this.#contentActions = contentActions ?? null;
		this.#containerClassName = containerClassName ?? null;
		this.#position = position ?? 'top';
		this.#animated = animated ?? false;
		this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter';
		this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave';
		this.#enterDelay = enterDelay ?? 0;
		this.#leaveDelay = leaveDelay ?? 0;
		this.#onEnter = onEnter ?? null;
		this.#onLeave = onLeave ?? null;
		this.#offset = Math.max(offset ?? 10, 5);
		this.#width = width ?? 'auto';
	}

	#applyChanges({
		hasStructureChanged,
		hasContainerClassNameChanged,
		hasWidthChanged,
		hasToDisableTarget,
		hasToEnableTarget
	}: ChangeSet) {
		if (hasStructureChanged) {
			this.#removeTooltipFromTarget();
			this.#createTooltip();
		}
		if (hasStructureChanged || hasContainerClassNameChanged) {
			this.#tooltip!.setAttribute(
				'class',
				this.#containerClassName || `__tooltip __tooltip-${this.#position}`
			);
		}
		if (hasWidthChanged) {
			this.#applyWidth();
		}
		if (hasToDisableTarget) {
			this.#disable();
		} else if (hasToEnableTarget) {
			this.#enable();
		}
	}

	async destroy() {
		this.#target?.style.removeProperty('position');
		this.#target?.removeAttribute('aria-describedby');

		await this.#removeTooltipFromTarget();

		this.#disable();

		this.#clearDelay();

		this.#observer?.clear();
		this.#observer = null;
	}

	#enable() {
		this.#enableTarget();
		this.#enableWindow();
	}

	#enableTarget() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this);
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this);

		this.#target?.addEventListener('mouseenter', this.#boundEnterHandler);
		this.#target?.addEventListener('mouseleave', this.#boundLeaveHandler);
		this.#target?.addEventListener('focusin', this.#boundEnterHandler);
		this.#target?.addEventListener('focusout', this.#boundLeaveHandler);
	}

	#enableWindow() {
		this.#boundWindowChangeHandler = this.#onWindowChange.bind(this);

		window.addEventListener('keydown', this.#boundWindowChangeHandler);
		window.addEventListener('resize', this.#boundWindowChangeHandler);
		window.addEventListener('scroll', this.#boundWindowChangeHandler);
	}

	#disable() {
		this.#disableTarget();
		this.#disableWindow();
	}

	#disableTarget() {
		if (this.#boundEnterHandler) {
			this.#target?.removeEventListener('mouseenter', this.#boundEnterHandler);
			this.#target?.removeEventListener('focusin', this.#boundEnterHandler);
		}
		if (this.#boundLeaveHandler) {
			this.#target?.removeEventListener('mouseleave', this.#boundLeaveHandler);
			this.#target?.removeEventListener('focusout', this.#boundLeaveHandler);
		}

		this.#boundEnterHandler = null;
		this.#boundLeaveHandler = null;
	}

	#disableWindow() {
		if (this.#boundWindowChangeHandler) {
			window.removeEventListener('keydown', this.#boundWindowChangeHandler);
			window.removeEventListener('resize', this.#boundWindowChangeHandler);
			window.removeEventListener('scroll', this.#boundWindowChangeHandler);
		}

		this.#boundWindowChangeHandler = null;
	}

	#createTooltip() {
		this.#tooltip = document.createElement('div');
		this.#tooltip.setAttribute('id', 'tooltip');
		this.#tooltip.setAttribute(
			'class',
			this.#containerClassName || `__tooltip __tooltip-${this.#position}`
		);
		this.#tooltip.setAttribute('role', 'tooltip');

		this.#applyWidth();

		if (this.#contentSelector) {
			this.#observer!.wait(this.#contentSelector, {
				events: [DOMObserver.EXIST, DOMObserver.ADD]
			}).then(({ node }: WaitResult) => {
				const templateNode = node as HTMLTemplateElement;
				const child = templateNode.content ? templateNode.content.firstElementChild : node;
				(child as HTMLElement).style.position = 'relative';
				this.#tooltip!.appendChild(child!.cloneNode(true));
			});
		} else if (this.#content) {
			const child = document.createTextNode(this.#content);
			this.#tooltip.appendChild(child);
		}

		this.#createAndAddTooltipArea();
	}

	#createAndAddTooltipArea() {
		const area = document.createElement('span');
		area.setAttribute('aria-hidden', 'true');
		area.setAttribute('class', '__tooltip-area');
		switch (this.#position) {
			case 'left': {
				area.setAttribute('style', `width: calc(100% + ${this.#offset}px)`);
				break;
			}
			case 'right': {
				area.setAttribute(
					'style',
					`width: calc(100% + ${this.#offset}px); margin-left: calc(-0.5rem - ${this.#offset}px)`
				);
				break;
			}
			case 'bottom': {
				area.setAttribute(
					'style',
					`height: calc(100% + ${this.#offset}px); margin-top: calc(-0.5rem - ${this.#offset}px)`
				);
				break;
			}
			default: {
				area.setAttribute('style', `height: calc(100% + ${this.#offset}px)`);
			}
		}
		this.#tooltip!.appendChild(area);
	}

	#applyWidth() {
		if (this.#width !== 'auto') {
			this.#tooltip!.style.width = this.#width;
		} else {
			this.#tooltip!.style.removeProperty('width');
		}
	}

	#resolvePlacement(targetRect: DOMRect, tooltipRect: DOMRect): PlacementResult {
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;

		const space: SpaceMap = {
			top: targetRect.top - this.#offset,
			bottom: vh - targetRect.bottom - this.#offset,
			left: targetRect.left - this.#offset,
			right: vw - targetRect.right - this.#offset
		};

		const isHorizontal = (pos: TooltipPosition) => pos === 'left' || pos === 'right';
		const fits = (pos: TooltipPosition) =>
			space[pos] >= (isHorizontal(pos) ? tooltipRect.width : tooltipRect.height);
		// Floor keeps the adapted width strictly within the available space.
		const adaptTo = (pos: TooltipPosition) => `${Math.floor(space[pos])}px`;

		if (fits(this.#position)) {
			return { position: this.#position, adaptedWidth: null };
		}

		if (
			isHorizontal(this.#position) &&
			this.#width === 'auto' &&
			space[this.#position] >= Tooltip.#MIN_WIDTH
		) {
			return { position: this.#position, adaptedWidth: adaptTo(this.#position) };
		}

		const candidates = (['top', 'bottom', 'left', 'right'] as TooltipPosition[])
			.filter((p) => p !== this.#position)
			.sort((a, b) => space[b] - space[a]);

		for (const pos of candidates) {
			if (fits(pos)) {
				return { position: pos, adaptedWidth: null };
			}
		}

		if (this.#width === 'auto') {
			for (const pos of candidates) {
				if (isHorizontal(pos) && space[pos] >= Tooltip.#MIN_WIDTH) {
					return { position: pos, adaptedWidth: adaptTo(pos) };
				}
			}
		}

		return { position: this.#position, adaptedWidth: null };
	}

	#positionTooltip() {
		const targetRect = this.#target!.getBoundingClientRect();
		let tooltipRect = this.#tooltip!.getBoundingClientRect();
		const { width: targetWidth, height: targetHeight } = targetRect;

		const { position: effectivePosition, adaptedWidth } = this.#resolvePlacement(
			targetRect,
			tooltipRect
		);

		if (adaptedWidth !== null) {
			this.#tooltip!.style.width = adaptedWidth;
			tooltipRect = this.#tooltip!.getBoundingClientRect();
		}

		if (effectivePosition !== this.#position && !this.#containerClassName) {
			this.#tooltip!.setAttribute('class', `__tooltip __tooltip-${effectivePosition}`);
		}

		const { width: tooltipWidth, height: tooltipHeight } = tooltipRect;

		switch (effectivePosition) {
			case 'left': {
				this.#tooltip!.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`;
				this.#tooltip!.style.left = `${-tooltipWidth - this.#offset}px`;
				this.#tooltip!.style.bottom = '';
				this.#tooltip!.style.right = '';
				break;
			}
			case 'right': {
				this.#tooltip!.style.top = `${-(tooltipHeight - targetHeight) >> 1}px`;
				this.#tooltip!.style.right = `${-tooltipWidth - this.#offset}px`;
				this.#tooltip!.style.bottom = '';
				this.#tooltip!.style.left = '';
				break;
			}
			case 'bottom': {
				this.#tooltip!.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`;
				this.#tooltip!.style.bottom = `${-tooltipHeight - this.#offset}px`;
				this.#tooltip!.style.right = '';
				this.#tooltip!.style.top = '';
				break;
			}
			default: {
				this.#tooltip!.style.left = `${-(tooltipWidth - targetWidth) >> 1}px`;
				this.#tooltip!.style.top = `${-tooltipHeight - this.#offset}px`;
				this.#tooltip!.style.right = '';
				this.#tooltip!.style.bottom = '';
			}
		}
	}

	async #appendTooltipToTarget() {
		if (this.#animated) {
			await this.#transitionTooltip(true);
		}

		this.#observer!.wait(this.#tooltip!, { events: [DOMObserver.ADD] }).then(() => {
			this.#positionTooltip();
		});
		this.#target!.appendChild(this.#tooltip!);

		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(
				([key, { eventType, callback, callbackParams, closeOnCallback }], i) => {
					const trigger = key === '*' ? this.#tooltip! : this.#tooltip!.querySelector(key);
					if (trigger) {
						const listener: EventListener = (event) => {
							callback?.apply(null, [...(callbackParams || []), event]);
							if (closeOnCallback) {
								this.#removeTooltipFromTarget();
							}
						};
						trigger.addEventListener(eventType, listener);
						this.#events.push({ trigger, eventType, listener });

						if (i === 0) (trigger as HTMLElement).focus();
					}
				}
			);
		}
	}

	async #removeTooltipFromTarget() {
		if (this.#animated) {
			await this.#transitionTooltip(false);
		}

		this.#tooltip!.remove();

		if (!this.#containerClassName) {
			this.#tooltip!.setAttribute('class', `__tooltip __tooltip-${this.#position}`);
		}

		this.#applyWidth();

		this.#events.forEach(({ trigger, eventType, listener }) =>
			trigger.removeEventListener(eventType, listener)
		);
		this.#events = [];
	}

	#waitForDelay(delay: number) {
		this.#clearDelay();
		return new Promise<void>(
			(resolve) =>
				(this.#delay = setTimeout(() => {
					this.#clearDelay();
					resolve();
				}, delay))
		);
	}

	#clearDelay() {
		clearTimeout(this.#delay);
		this.#delay = undefined;
	}

	#transitionTooltip(entering: boolean) {
		return new Promise<void>((resolve) => {
			if (entering) {
				this.#tooltip!.classList.add(this.#animationEnterClassName!);
				this.#tooltip!.classList.remove(this.#animationLeaveClassName!);
				this.#transitioning = false;
				resolve();
			} else {
				const onTransitionEnd = () => {
					this.#tooltip!.removeEventListener('animationend', onTransitionEnd);
					this.#tooltip!.classList.remove(this.#animationLeaveClassName!);
					if (this.#transitioning) {
						this.#transitioning = false;
						resolve();
					}
				};

				if (!this.#transitioning) {
					this.#tooltip!.addEventListener('animationend', onTransitionEnd);
					this.#tooltip!.classList.add(this.#animationLeaveClassName!);
					this.#tooltip!.classList.remove(this.#animationEnterClassName!);
					this.#transitioning = true;
				}
			}
		});
	}

	async #onTargetEnter(e: Event) {
		if (this.#target === e.target) {
			await this.#waitForDelay(this.#enterDelay);
			await this.#appendTooltipToTarget();
			await standby(0);
			this.#onEnter?.();
		}
	}

	async #onTargetLeave(e: Event) {
		if (this.#target === e.target || !this.#target?.contains(e.target as Node)) {
			await this.#waitForDelay(this.#leaveDelay);
			await this.#removeTooltipFromTarget();
			await standby(0);
			this.#onLeave?.();
		}
	}

	async #onWindowChange(e: Event) {
		const ke = e as KeyboardEvent;
		if (
			this.#tooltip &&
			this.#tooltip.parentNode &&
			(e.type !== 'keydown' || ke.key === 'Escape' || ke.key === 'Esc')
		) {
			await this.#removeTooltipFromTarget();
		}
	}
}

export default Tooltip;
