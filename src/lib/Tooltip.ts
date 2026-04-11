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

export type TooltipOptions = {
	content?: string | null;
	contentSelector?: string | null;
	contentActions?: ContentActions | null;
	containerClassName?: string | null;
	position?: TooltipPosition;
	animated?: boolean;
	animationEnterClassName?: string | null;
	animationLeaveClassName?: string | null;
	enterDelay?: number;
	leaveDelay?: number;
	onEnter?: (() => void) | null;
	onLeave?: (() => void) | null;
	offset?: number;
	width?: string;
	disabled?: boolean;
	open?: boolean;
	touchBehavior?: 'hover' | 'toggle';
};

type SpaceMap = Record<TooltipPosition, number>;
type PlacementResult = { position: TooltipPosition; adaptedWidth: string | null };
type EventRecord = { trigger: Element; eventType: string; listener: EventListener };
type ChangeSet = {
	hasStructureChanged: boolean;
	hasContainerClassNameChanged: boolean;
	hasWidthChanged: boolean;
	hasToDisableTarget: boolean;
	hasToEnableTarget: boolean;
	hasToShow: boolean;
	hasToHide: boolean;
	hasInteractivityChanged: boolean;
};

class Tooltip {
	static #instances: Tooltip[] = [];
	// Minimum width (px) a horizontal position must offer before width-adaptation is attempted.
	// Below this threshold the tooltip switches to a different position instead.
	static #MIN_WIDTH = 80;
	static #ANIMATION_TIMEOUT_MS = 1000;

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
	#touchBehavior: 'hover' | 'toggle' | null = null;

	#id: string;

	#originalTitle: string | null = null;

	#open: boolean | undefined = undefined;

	#destroyed = false;

	#observer: DOMObserver | null = null;
	#events: EventRecord[] = [];
	#delay: ReturnType<typeof setTimeout> | undefined;
	#animationTimer: ReturnType<typeof setTimeout> | undefined;

	#boundEnterHandler: ((e: Event) => void) | null = null;
	#boundLeaveHandler: ((e: Event) => void) | null = null;
	#boundTouchToggleHandler: ((e: Event) => void) | null = null;
	#boundWindowChangeHandler: ((e: Event) => void) | null = null;
	#trapHandler: ((e: KeyboardEvent) => void) | null = null;
	#scrollableAncestors: Element[] = [];

	static destroy() {
		Tooltip.#instances.forEach((instance) => {
			instance.destroy();
		});
		Tooltip.#instances = [];
	}

	constructor(target: HTMLElement, options: TooltipOptions = {}) {
		const {
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
			width,
			disabled,
			open
		} = options;

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

		this.#id = `tooltip-${crypto.randomUUID()}`;

		this.#observer = new DOMObserver();

		this.#createTooltip();

		this.#originalTitle = this.#target.getAttribute('title');
		this.#target.removeAttribute('title');
		this.#target.style.position = 'relative';

		if (this.#isInteractive()) {
			this.#target.setAttribute('aria-expanded', 'false');
			this.#target.setAttribute('aria-haspopup', 'dialog');
		}

		this.#open = open === true ? true : undefined;

		disabled ? this.#disable() : this.#enable();

		if (this.#open && !disabled) {
			this.#appendTooltipToTarget();
		}

		Tooltip.#instances.push(this);
	}

	update(options: TooltipOptions) {
		if (this.#destroyed) return;
		const changes = this.#detectChanges(options);
		this.#applyState(options);
		this.#applyChanges(changes);
	}

	#detectChanges({
		content,
		contentSelector,
		contentActions,
		containerClassName,
		position,
		offset,
		width,
		disabled,
		open
	}: TooltipOptions): ChangeSet {
		const hasContentChanged =
			(contentSelector !== undefined && contentSelector !== this.#contentSelector) ||
			(content !== undefined && content !== this.#content);
		const hasStructureChanged =
			hasContentChanged ||
			(position !== undefined && position !== this.#position) ||
			(offset !== undefined && offset !== this.#offset);
		const isCurrentlyShown = !!this.#tooltip?.parentNode;
		return {
			hasStructureChanged,
			hasContainerClassNameChanged:
				containerClassName !== undefined && containerClassName !== this.#containerClassName,
			hasWidthChanged: width !== undefined && width !== this.#width,
			hasToDisableTarget: !!disabled && Boolean(this.#boundEnterHandler),
			hasToEnableTarget: !disabled && !Boolean(this.#boundEnterHandler),
			// Re-show when open:true is passed after a structure rebuild (tooltip removed from DOM),
			// or when the tooltip is not yet visible. Guard with !disabled so open+disabled is a no-op.
			hasToShow: open === true && !disabled && (!isCurrentlyShown || hasStructureChanged),
			// Skip explicit hide when structure already removed the tooltip from the DOM.
			hasToHide: open === false && isCurrentlyShown && !hasStructureChanged,
			hasInteractivityChanged:
				contentActions !== undefined &&
				Object.keys(contentActions ?? {}).length > 0 !== this.#isInteractive()
		};
	}

	#applyState({
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
		width,
		open,
		touchBehavior
	}: TooltipOptions) {
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
		// false is treated as a one-shot close — no lock. Only true locks the tooltip open.
		this.#open = open === true ? true : undefined;
		this.#touchBehavior = touchBehavior ?? null;
	}

	#applyChanges({
		hasStructureChanged,
		hasContainerClassNameChanged,
		hasWidthChanged,
		hasToDisableTarget,
		hasToEnableTarget,
		hasToShow,
		hasToHide,
		hasInteractivityChanged
	}: ChangeSet) {
		if (hasStructureChanged) {
			this.#removeTooltipFromTarget(true);
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
			if (this.#tooltip?.parentNode) {
				this.#removeTooltipFromTarget();
			}
			this.#disable();
		} else if (hasToEnableTarget) {
			this.#enable();
		}

		if (hasToShow) {
			this.#appendTooltipToTarget();
		} else if (hasToHide) {
			this.#removeTooltipFromTarget();
		}

		if (hasInteractivityChanged) {
			if (this.#isInteractive()) {
				this.#target?.setAttribute('aria-expanded', this.#tooltip?.parentNode ? 'true' : 'false');
				this.#target?.setAttribute('aria-haspopup', 'dialog');
			} else {
				this.#target?.removeAttribute('aria-expanded');
				this.#target?.removeAttribute('aria-haspopup');
			}
		}
	}

	async destroy() {
		this.#destroyed = true;

		clearTimeout(this.#animationTimer);
		this.#animationTimer = undefined;

		if (this.#originalTitle !== null) {
			this.#target?.setAttribute('title', this.#originalTitle);
		}
		this.#target?.style.removeProperty('position');
		this.#target?.removeAttribute('aria-describedby');
		this.#target?.removeAttribute('aria-expanded');
		this.#target?.removeAttribute('aria-haspopup');

		await this.#removeTooltipFromTarget(true);

		this.#disable();

		this.#clearDelay();

		this.#observer?.clear();
		this.#observer = null;

		Tooltip.#instances = Tooltip.#instances.filter((i) => i !== this);
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

		if (this.#touchBehavior === 'hover') {
			this.#target?.addEventListener('touchstart', this.#boundEnterHandler, { passive: true });
			this.#target?.addEventListener('touchend', this.#boundLeaveHandler, { passive: true });
			this.#target?.addEventListener('touchcancel', this.#boundLeaveHandler, { passive: true });
		} else if (this.#touchBehavior === 'toggle') {
			this.#boundTouchToggleHandler = this.#onTouchToggle.bind(this);
			this.#target?.addEventListener('touchend', this.#boundTouchToggleHandler, { passive: true });
		}
	}

	#enableWindow() {
		this.#boundWindowChangeHandler = this.#onWindowChange.bind(this);

		window.addEventListener('keydown', this.#boundWindowChangeHandler);
		window.addEventListener('resize', this.#boundWindowChangeHandler);
		window.addEventListener('scroll', this.#boundWindowChangeHandler);

		this.#scrollableAncestors = this.#getScrollableAncestors();
		this.#scrollableAncestors.forEach((ancestor) => {
			ancestor.addEventListener('scroll', this.#boundWindowChangeHandler!);
		});

		if (this.#touchBehavior === 'toggle') {
			window.addEventListener('touchstart', this.#boundWindowChangeHandler, { passive: true });
		}
	}

	#getScrollableAncestors(): Element[] {
		const scrollable = ['auto', 'scroll'];
		const ancestors: Element[] = [];
		let el: Element | null = this.#target?.parentElement ?? null;
		while (el && el !== document.documentElement) {
			const { overflowX, overflowY } = window.getComputedStyle(el);
			if (scrollable.includes(overflowX) || scrollable.includes(overflowY)) {
				ancestors.push(el);
			}
			el = el.parentElement;
		}
		return ancestors;
	}

	#disable() {
		this.#disableTarget();
		this.#disableWindow();
	}

	#disableTarget() {
		if (this.#boundEnterHandler) {
			this.#target?.removeEventListener('mouseenter', this.#boundEnterHandler);
			this.#target?.removeEventListener('focusin', this.#boundEnterHandler);
			this.#target?.removeEventListener('touchstart', this.#boundEnterHandler);
		}
		if (this.#boundLeaveHandler) {
			this.#target?.removeEventListener('mouseleave', this.#boundLeaveHandler);
			this.#target?.removeEventListener('focusout', this.#boundLeaveHandler);
			this.#target?.removeEventListener('touchend', this.#boundLeaveHandler);
			this.#target?.removeEventListener('touchcancel', this.#boundLeaveHandler);
		}
		if (this.#boundTouchToggleHandler) {
			this.#target?.removeEventListener('touchend', this.#boundTouchToggleHandler);
			this.#boundTouchToggleHandler = null;
		}

		this.#boundEnterHandler = null;
		this.#boundLeaveHandler = null;
	}

	#disableWindow() {
		if (this.#boundWindowChangeHandler) {
			window.removeEventListener('keydown', this.#boundWindowChangeHandler);
			window.removeEventListener('resize', this.#boundWindowChangeHandler);
			window.removeEventListener('scroll', this.#boundWindowChangeHandler);

			this.#scrollableAncestors.forEach((ancestor) => {
				ancestor.removeEventListener('scroll', this.#boundWindowChangeHandler!);
			});
			this.#scrollableAncestors = [];

			if (this.#touchBehavior === 'toggle') {
				window.removeEventListener('touchstart', this.#boundWindowChangeHandler);
			}
		}

		this.#boundWindowChangeHandler = null;
	}

	#createTooltip() {
		this.#tooltip = document.createElement('div');
		this.#tooltip.setAttribute('id', this.#id);
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
				if (this.#destroyed) return;
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

		this.#target!.setAttribute('aria-describedby', this.#id);

		if (this.#isInteractive()) {
			this.#target!.setAttribute('aria-expanded', 'true');
		}

		this.#observer!.wait(this.#tooltip!, { events: [DOMObserver.ADD] }).then(() => {
			if (this.#destroyed) return;
			this.#positionTooltip();
		});
		this.#target!.appendChild(this.#tooltip!);

		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(
				([key, { eventType, callback, callbackParams, closeOnCallback }]) => {
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
					}
				}
			);
			this.#setupFocusTrap();
		}
	}

	async #removeTooltipFromTarget(skipAnimation = false) {
		if (this.#animated && !skipAnimation) {
			await this.#transitionTooltip(false);
		}

		this.#tooltip!.remove();
		this.#target?.removeAttribute('aria-describedby');

		if (this.#isInteractive() && !this.#destroyed) {
			this.#target?.setAttribute('aria-expanded', 'false');
		}

		if (!this.#containerClassName) {
			this.#tooltip!.setAttribute('class', `__tooltip __tooltip-${this.#position}`);
		}

		this.#applyWidth();

		this.#events.forEach(({ trigger, eventType, listener }) =>
			trigger.removeEventListener(eventType, listener)
		);
		this.#events = [];

		this.#teardownFocusTrap();
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

	#isInteractive() {
		return Object.keys(this.#contentActions ?? {}).length > 0;
	}

	#setupFocusTrap(): void {
		const focusable = this.#tooltip!.querySelectorAll<HTMLElement>(
			[
				'a[href]',
				'button:not([disabled])',
				'input:not([disabled]):not([type="hidden"])',
				'select:not([disabled])',
				'textarea:not([disabled])',
				'[contenteditable]:not([contenteditable="false"])',
				'[tabindex]:not([tabindex="-1"])'
			].join(', ')
		);
		if (!focusable.length) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		this.#trapHandler = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		this.#tooltip!.addEventListener('keydown', this.#trapHandler);
		first.focus();
	}

	#teardownFocusTrap(): void {
		if (this.#trapHandler) {
			this.#tooltip?.removeEventListener('keydown', this.#trapHandler);
			this.#trapHandler = null;
			// Temporarily remove the focusin listener so that returning focus to the trigger
			// does not re-open the tooltip.
			if (this.#boundEnterHandler) {
				this.#target?.removeEventListener('focusin', this.#boundEnterHandler);
			}
			this.#target?.focus();
			if (this.#boundEnterHandler) {
				this.#target?.addEventListener('focusin', this.#boundEnterHandler);
			}
		}
	}

	#transitionTooltip(entering: boolean) {
		return new Promise<void>((resolve) => {
			if (entering) {
				this.#tooltip!.classList.add(this.#animationEnterClassName!);
				this.#tooltip!.classList.remove(this.#animationLeaveClassName!);
				resolve();
			} else {
				const cleanup = () => {
					clearTimeout(this.#animationTimer);
					this.#animationTimer = undefined;
					this.#tooltip!.removeEventListener('animationend', cleanup);
					this.#tooltip!.classList.remove(this.#animationLeaveClassName!);
					resolve();
				};
				this.#animationTimer = setTimeout(cleanup, Tooltip.#ANIMATION_TIMEOUT_MS);
				this.#tooltip!.addEventListener('animationend', cleanup, { once: true });
				this.#tooltip!.classList.add(this.#animationLeaveClassName!);
				this.#tooltip!.classList.remove(this.#animationEnterClassName!);
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
		if (this.#open) return;
		if (e.type === 'focusout' && this.#target?.contains((e as FocusEvent).relatedTarget as Node))
			return;
		if (this.#target === e.target || !this.#target?.contains(e.target as Node)) {
			await this.#waitForDelay(this.#leaveDelay);
			await this.#removeTooltipFromTarget();
			await standby(0);
			this.#onLeave?.();
		}
	}

	async #onWindowChange(e: Event) {
		if (this.#open) return;
		const ke = e as KeyboardEvent;
		if (
			this.#tooltip &&
			this.#tooltip.parentNode &&
			(e.type !== 'keydown' || ke.key === 'Escape' || ke.key === 'Esc') &&
			(e.type !== 'touchstart' || !this.#target?.contains(e.target as Node))
		) {
			await this.#removeTooltipFromTarget();
		}
	}

	async #onTouchToggle(_e: Event) {
		if (this.#tooltip?.parentNode) {
			await this.#waitForDelay(this.#leaveDelay);
			await this.#removeTooltipFromTarget();
			await standby(0);
			this.#onLeave?.();
		} else {
			await this.#waitForDelay(this.#enterDelay);
			await this.#appendTooltipToTarget();
			await standby(0);
			this.#onEnter?.();
		}
	}
}

export default Tooltip;
