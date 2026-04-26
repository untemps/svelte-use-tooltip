import { DOMObserver, type WaitResult } from '@untemps/dom-observer';
import { standby } from '@untemps/utils/async/standby';
import { DEV } from 'esm-env';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type ContentAction = {
	eventType: string;
	callback: (...args: unknown[]) => void;
	callbackParams?: unknown[];
	closeOnCallback?: boolean;
};

export type ContentActionValue = ContentAction | ContentAction[];

export type ContentActions = Record<string, ContentActionValue>;

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
	portal?: boolean;
	touchBehavior?: 'hover' | 'toggle';
	showOn?: string[];
	hideOn?: string[];
	ariaLabel?: string | null;
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
	hasTouchBehaviorChanged: boolean;
	hasShowHideConfigChanged: boolean;
	hasToShow: boolean;
	hasToHide: boolean;
	hasInteractivityChanged: boolean;
	hasAriaLabelChanged: boolean;
	hasPortalChanged: boolean;
};

class Tooltip {
	static #instances: Tooltip[] = [];
	// Minimum width (px) a horizontal position must offer before width-adaptation is attempted.
	// Below this threshold the tooltip switches to a different position instead.
	static #MIN_WIDTH = 80;
	static #ANIMATION_TIMEOUT_MS = 1000;
	static #PORTAL_HOVER_BRIDGE_MS = 16; // one animation frame — lets mouseenter on the tooltip fire before the hide executes
	static #DEFAULT_SHOW_ON = ['mouseenter', 'focusin'];
	static #DEFAULT_HIDE_ON = ['mouseleave', 'focusout'];
	static #DEFAULT_ARIA_LABEL = 'Tooltip';
	static #FOCUSABLE_SELECTOR = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled]):not([type="hidden"])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[contenteditable]:not([contenteditable="false"])',
		'[tabindex]:not([tabindex="-1"])'
	].join(', ');

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
	#showOn: string[] = Tooltip.#DEFAULT_SHOW_ON;
	#hideOn: string[] = Tooltip.#DEFAULT_HIDE_ON;
	#ariaLabel = Tooltip.#DEFAULT_ARIA_LABEL;

	#id: string;

	#originalTitle: string | null = null;
	#addedTabIndex = false;

	#open: boolean | undefined = undefined;
	#portal = true;

	#destroyed = false;

	#observer: DOMObserver | null = null;
	#events: EventRecord[] = [];
	#delay: ReturnType<typeof setTimeout> | undefined;
	#animationTimer: ReturnType<typeof setTimeout> | undefined;

	#boundEnterHandler: ((e: Event) => void) | null = null;
	#boundLeaveHandler: ((e: Event) => void) | null = null;
	#boundToggleHandler: ((e: Event) => void) | null = null;
	#boundTouchToggleHandler: ((e: Event) => void) | null = null;
	#boundWindowChangeHandler: ((e: Event) => void) | null = null;
	#boundTooltipEnterHandler: ((e: Event) => void) | null = null;
	#boundTooltipLeaveHandler: ((e: Event) => void) | null = null;
	#trapHandler: ((e: KeyboardEvent) => void) | null = null;
	#scrollableAncestors: Element[] = [];
	#tooltipHovered = false;
	#delayReject: ((reason: unknown) => void) | null = null;
	#computedFontFamily = '';
	#computedFontSize = '';
	#computedLineHeight = '';

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
			open,
			portal,
			touchBehavior,
			showOn,
			hideOn,
			ariaLabel
		} = options;

		this.#target = target;
		this.#content = content ?? null;
		this.#contentSelector = contentSelector ?? null;
		this.#contentActions = contentActions ?? null;
		this.#enforceContentActionsConstraint();
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
		this.#touchBehavior = touchBehavior ?? null;
		this.#showOn = showOn ?? Tooltip.#DEFAULT_SHOW_ON;
		this.#hideOn = hideOn ?? Tooltip.#DEFAULT_HIDE_ON;
		this.#ariaLabel = ariaLabel ?? Tooltip.#DEFAULT_ARIA_LABEL;
		this.#portal = portal ?? true;
		if (this.#portal) this.#syncComputedFont();

		this.#id = `tooltip-${crypto.randomUUID()}`;

		this.#observer = new DOMObserver();

		this.#createTooltip();

		this.#originalTitle = this.#target.getAttribute('title');
		this.#target.removeAttribute('title');
		if (!this.#portal) this.#target.style.position = 'relative';

		if (this.#isInteractive()) {
			this.#target.setAttribute('aria-expanded', 'false');
			this.#target.setAttribute('aria-haspopup', 'dialog');
			this.#syncTabIndex();
		}

		this.#warnIfNoContent();

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
		this.#applyChanges(changes, options);
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
		open,
		portal,
		touchBehavior,
		showOn,
		hideOn,
		ariaLabel
	}: TooltipOptions): ChangeSet {
		const hasContentChanged =
			(contentSelector !== undefined && contentSelector !== this.#contentSelector) ||
			(content !== undefined && content !== this.#content);
		const hasStructureChanged =
			hasContentChanged ||
			(position !== undefined && position !== this.#position) ||
			(offset !== undefined && Math.max(offset, 5) !== this.#offset);
		const isCurrentlyShown = !!this.#tooltip?.parentNode;
		return {
			hasStructureChanged,
			hasContainerClassNameChanged:
				containerClassName !== undefined && containerClassName !== this.#containerClassName,
			hasWidthChanged: width !== undefined && width !== this.#width,
			hasToDisableTarget: disabled === true && Boolean(this.#boundEnterHandler),
			hasToEnableTarget: disabled === false && !Boolean(this.#boundEnterHandler),
			hasTouchBehaviorChanged: touchBehavior !== undefined && touchBehavior !== this.#touchBehavior,
			hasShowHideConfigChanged:
				(showOn !== undefined && showOn.join(',') !== this.#showOn.join(',')) ||
				(hideOn !== undefined && hideOn.join(',') !== this.#hideOn.join(',')),
			// Re-show when open:true is passed after a structure rebuild (tooltip removed from DOM),
			// or when the tooltip is not yet visible. Skip when disabled is explicitly true.
			hasToShow: open === true && disabled !== true && (!isCurrentlyShown || hasStructureChanged),
			// Skip explicit hide when structure already removed the tooltip from the DOM.
			hasToHide: open === false && isCurrentlyShown && !hasStructureChanged,
			hasInteractivityChanged: (() => {
				// Predict what #applyState will produce without mutating state.
				const nextActions =
					contentActions !== undefined ? (contentActions ?? null) : this.#contentActions;
				const nextSelector =
					contentSelector !== undefined ? (contentSelector ?? null) : this.#contentSelector;
				const effectiveActions = this.#computeEffectiveActions(nextActions, nextSelector);
				const nextIsInteractive = !!effectiveActions && Object.keys(effectiveActions).length > 0;
				return nextIsInteractive !== this.#isInteractive();
			})(),
			hasAriaLabelChanged:
				ariaLabel !== undefined &&
				(ariaLabel === null ? Tooltip.#DEFAULT_ARIA_LABEL : ariaLabel) !== this.#ariaLabel,
			hasPortalChanged: portal !== undefined && portal !== this.#portal
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
		portal,
		touchBehavior,
		ariaLabel
	}: TooltipOptions) {
		if (content !== undefined) this.#content = content;
		if (contentSelector !== undefined) this.#contentSelector = contentSelector;
		if (contentActions !== undefined) this.#contentActions = contentActions;
		this.#enforceContentActionsConstraint();
		if (containerClassName !== undefined) this.#containerClassName = containerClassName;
		if (position !== undefined) this.#position = position;
		if (animated !== undefined) this.#animated = animated;
		if (animationEnterClassName !== undefined)
			this.#animationEnterClassName = animationEnterClassName || '__tooltip-enter';
		if (animationLeaveClassName !== undefined)
			this.#animationLeaveClassName = animationLeaveClassName || '__tooltip-leave';
		if (enterDelay !== undefined) this.#enterDelay = enterDelay;
		if (leaveDelay !== undefined) this.#leaveDelay = leaveDelay;
		if (onEnter !== undefined) this.#onEnter = onEnter;
		if (onLeave !== undefined) this.#onLeave = onLeave;
		if (offset !== undefined) this.#offset = Math.max(offset, 5);
		if (width !== undefined) this.#width = width;
		// false is treated as a one-shot close — no lock. Only true locks the tooltip open.
		if (open !== undefined) this.#open = open === true ? true : undefined;
		if (touchBehavior !== undefined) this.#touchBehavior = touchBehavior;
		if (ariaLabel !== undefined)
			this.#ariaLabel = ariaLabel === null ? Tooltip.#DEFAULT_ARIA_LABEL : ariaLabel;
		if (portal !== undefined) this.#portal = portal;
		// #showOn / #hideOn are intentionally NOT updated here: they must be applied between
		// #disable() and #enable() in #applyChanges so that #disableTarget removes the OLD
		// listeners before #enableTarget registers the NEW ones.
	}

	#applyChanges(
		{
			hasStructureChanged,
			hasContainerClassNameChanged,
			hasWidthChanged,
			hasToDisableTarget,
			hasToEnableTarget,
			hasTouchBehaviorChanged,
			hasShowHideConfigChanged,
			hasToShow,
			hasToHide,
			hasInteractivityChanged,
			hasAriaLabelChanged,
			hasPortalChanged
		}: ChangeSet,
		options: TooltipOptions = {}
	) {
		if (hasPortalChanged) {
			if (this.#portal) {
				this.#target?.style.removeProperty('position');
				this.#syncComputedFont();
			} else {
				this.#target!.style.position = 'relative';
			}
			if (this.#tooltip?.parentNode) {
				this.#tooltip!.style.position = this.#portal ? 'fixed' : '';
				const container = this.#portal ? document.body : this.#target!;
				container.appendChild(this.#tooltip!);
				this.#positionTooltip();
			}
		}
		if (hasStructureChanged) {
			this.#removeTooltipFromTarget(true);
			// Cancel any pending contentSelector observer before re-registering a new one,
			// otherwise both resolve when the template appears and content is appended twice.
			this.#observer?.clear();
			this.#createTooltip();
			// Re-evaluate tabindex: the template may now have or lack focusable elements.
			this.#syncTabIndex();
			this.#warnIfNoContent();
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
			// #disable() uses the OLD #showOn/#hideOn to remove the correct listeners.
			this.#disable();
			// Update after disable so the new values are ready for the next #enable().
			if (options.showOn !== undefined) this.#showOn = options.showOn;
			if (options.hideOn !== undefined) this.#hideOn = options.hideOn;
		} else if (hasToEnableTarget) {
			// Update before #enable() so the new listeners are registered with the new config.
			if (options.showOn !== undefined) this.#showOn = options.showOn;
			if (options.hideOn !== undefined) this.#hideOn = options.hideOn;
			this.#enable();
		} else if (hasTouchBehaviorChanged || hasShowHideConfigChanged) {
			// #disable() uses the OLD #showOn/#hideOn to remove the correct listeners.
			this.#disable();
			if (options.showOn !== undefined) this.#showOn = options.showOn;
			if (options.hideOn !== undefined) this.#hideOn = options.hideOn;
			this.#enable();
		}

		if (hasToShow) {
			this.#appendTooltipToTarget().then(() => this.#onEnter?.());
		} else if (hasToHide) {
			this.#removeTooltipFromTarget().then(() => this.#onLeave?.());
		}

		if (hasInteractivityChanged) {
			if (this.#isInteractive()) {
				this.#tooltip?.setAttribute('role', 'dialog');
				this.#tooltip?.setAttribute('aria-label', this.#ariaLabel);
				this.#target?.removeAttribute('aria-describedby');
				this.#target?.setAttribute('aria-expanded', this.#tooltip?.parentNode ? 'true' : 'false');
				this.#target?.setAttribute('aria-haspopup', 'dialog');
				this.#syncTabIndex();
			} else {
				this.#tooltip?.setAttribute('role', 'tooltip');
				this.#tooltip?.removeAttribute('aria-label');
				if (this.#tooltip?.parentNode) {
					this.#target?.setAttribute('aria-describedby', this.#id);
				}
				this.#target?.removeAttribute('aria-expanded');
				this.#target?.removeAttribute('aria-haspopup');
				this.#restoreTabIndex();
			}
		}

		if (hasAriaLabelChanged && this.#isInteractive()) {
			this.#tooltip?.setAttribute('aria-label', this.#ariaLabel);
		}
	}

	async destroy() {
		this.#destroyed = true;

		clearTimeout(this.#animationTimer);
		this.#animationTimer = undefined;

		if (this.#originalTitle !== null) {
			this.#target?.setAttribute('title', this.#originalTitle);
		}
		if (!this.#portal) this.#target?.style.removeProperty('position');
		this.#target?.removeAttribute('aria-describedby');
		this.#target?.removeAttribute('aria-expanded');
		this.#target?.removeAttribute('aria-haspopup');
		this.#restoreTabIndex();

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

	#partitionEvents(): {
		toggleEvents: string[];
		showOnlyEvents: string[];
		hideOnlyEvents: string[];
	} {
		return {
			toggleEvents: this.#showOn.filter((evt) => this.#hideOn.includes(evt)),
			showOnlyEvents: this.#showOn.filter((evt) => !this.#hideOn.includes(evt)),
			hideOnlyEvents: this.#hideOn.filter((evt) => !this.#showOn.includes(evt))
		};
	}

	#enableTarget() {
		this.#boundEnterHandler = this.#onTargetEnter.bind(this);
		this.#boundLeaveHandler = this.#onTargetLeave.bind(this);

		const { toggleEvents, showOnlyEvents, hideOnlyEvents } = this.#partitionEvents();

		if (toggleEvents.length) {
			this.#boundToggleHandler = this.#onTargetToggle.bind(this);
			toggleEvents.forEach((evt) => this.#target?.addEventListener(evt, this.#boundToggleHandler!));
		}
		showOnlyEvents.forEach((evt) => this.#target?.addEventListener(evt, this.#boundEnterHandler!));
		hideOnlyEvents.forEach((evt) => this.#target?.addEventListener(evt, this.#boundLeaveHandler!));

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
		const { toggleEvents, showOnlyEvents, hideOnlyEvents } = this.#partitionEvents();

		if (this.#boundToggleHandler) {
			toggleEvents.forEach((evt) =>
				this.#target?.removeEventListener(evt, this.#boundToggleHandler!)
			);
			this.#boundToggleHandler = null;
		}
		if (this.#boundEnterHandler) {
			showOnlyEvents.forEach((evt) =>
				this.#target?.removeEventListener(evt, this.#boundEnterHandler!)
			);
			// Touch events from touchBehavior are always cleaned up regardless of showOn.
			this.#target?.removeEventListener('touchstart', this.#boundEnterHandler);
		}
		if (this.#boundLeaveHandler) {
			hideOnlyEvents.forEach((evt) =>
				this.#target?.removeEventListener(evt, this.#boundLeaveHandler!)
			);
			// Touch events from touchBehavior are always cleaned up regardless of hideOn.
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

			window.removeEventListener('touchstart', this.#boundWindowChangeHandler);
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
		if (this.#isInteractive()) {
			this.#tooltip.setAttribute('role', 'dialog');
			this.#tooltip.setAttribute('aria-label', this.#ariaLabel);
		} else {
			this.#tooltip.setAttribute('role', 'tooltip');
		}

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

		// Viewport-absolute origin; inline mode subtracts target offset to get relative coords.
		const ox = this.#portal ? 0 : targetRect.left;
		const oy = this.#portal ? 0 : targetRect.top;
		const t = this.#tooltip!.style;

		switch (effectivePosition) {
			case 'left':
				t.left = `${targetRect.left - tooltipWidth - this.#offset - ox}px`;
				t.top = `${targetRect.top + ((targetHeight - tooltipHeight) >> 1) - oy}px`;
				t.bottom = '';
				t.right = '';
				break;
			case 'right':
				t.left = `${targetRect.right + this.#offset - ox}px`;
				t.top = `${targetRect.top + ((targetHeight - tooltipHeight) >> 1) - oy}px`;
				t.bottom = '';
				t.right = '';
				break;
			case 'bottom':
				t.left = `${targetRect.left + ((targetWidth - tooltipWidth) >> 1) - ox}px`;
				t.top = `${targetRect.bottom + this.#offset - oy}px`;
				t.right = '';
				t.bottom = '';
				break;
			default:
				t.left = `${targetRect.left + ((targetWidth - tooltipWidth) >> 1) - ox}px`;
				t.top = `${targetRect.top - tooltipHeight - this.#offset - oy}px`;
				t.right = '';
				t.bottom = '';
		}
	}

	async #appendTooltipToTarget() {
		if (this.#animated) {
			await this.#transitionTooltip(true);
		}

		if (!this.#isInteractive()) {
			this.#target!.setAttribute('aria-describedby', this.#id);
		}

		if (this.#isInteractive()) {
			this.#target!.setAttribute('aria-expanded', 'true');
		}

		this.#tooltip!.style.position = this.#portal ? 'fixed' : '';
		if (this.#portal) {
			if (this.#computedFontFamily) this.#tooltip!.style.fontFamily = this.#computedFontFamily;
			if (this.#computedFontSize) this.#tooltip!.style.fontSize = this.#computedFontSize;
			if (this.#computedLineHeight) this.#tooltip!.style.lineHeight = this.#computedLineHeight;
			// Bridge hover gap between target and tooltip: cancel pending hide when
			// mouse enters the tooltip, and start hide when it leaves.
			// Only needed for interactive tooltips — non-interactive ones hide on target leave.
			if (this.#isInteractive() && !this.#boundTooltipEnterHandler) {
				this.#boundTooltipEnterHandler = () => {
					this.#tooltipHovered = true;
					this.#clearDelay();
				};
				this.#boundTooltipLeaveHandler = async () => {
					this.#tooltipHovered = false;
					if (!this.#open && this.#tooltip?.parentNode) {
						await this.#scheduleHide();
					}
				};
				this.#tooltip!.addEventListener('mouseenter', this.#boundTooltipEnterHandler);
				this.#tooltip!.addEventListener('mouseleave', this.#boundTooltipLeaveHandler);
			}
		} else {
			this.#tooltip!.style.removeProperty('font-family');
			this.#tooltip!.style.removeProperty('font-size');
			this.#tooltip!.style.removeProperty('line-height');
		}
		this.#observer!.wait(this.#tooltip!, { events: [DOMObserver.ADD] }).then(() => {
			if (this.#destroyed) return;
			this.#positionTooltip();
		});
		const container = this.#portal ? document.body : this.#target!;
		container.appendChild(this.#tooltip!);

		if (this.#contentActions) {
			Object.entries(this.#contentActions).forEach(([key, actionValue]) => {
				const triggers =
					key === '*' ? [this.#tooltip!] : Array.from(this.#tooltip!.querySelectorAll(key));
				const actions = Array.isArray(actionValue) ? actionValue : [actionValue];
				for (const trigger of triggers) {
					for (const { eventType, callback, callbackParams, closeOnCallback } of actions) {
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
			});
			this.#setupFocusTrap();
		}
	}

	async #removeTooltipFromTarget(skipAnimation = false) {
		if (this.#animated && !skipAnimation) {
			await this.#transitionTooltip(false);
		}

		this.#tooltip!.remove();
		if (!this.#isInteractive()) {
			this.#target?.removeAttribute('aria-describedby');
		}

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

		this.#tooltipHovered = false;
		if (this.#boundTooltipEnterHandler) {
			this.#tooltip?.removeEventListener('mouseenter', this.#boundTooltipEnterHandler);
			this.#boundTooltipEnterHandler = null;
		}
		if (this.#boundTooltipLeaveHandler) {
			this.#tooltip?.removeEventListener('mouseleave', this.#boundTooltipLeaveHandler);
			this.#boundTooltipLeaveHandler = null;
		}

		this.#teardownFocusTrap();
	}

	#syncComputedFont() {
		const cs = getComputedStyle(this.#target!);
		this.#computedFontFamily = cs.fontFamily;
		this.#computedFontSize = cs.fontSize;
		this.#computedLineHeight = cs.lineHeight;
	}

	#waitForDelay(delay: number): Promise<void> {
		this.#clearDelay();
		if (!delay) return Promise.resolve();
		return new Promise<void>((resolve, reject) => {
			this.#delayReject = reject;
			this.#delay = setTimeout(() => {
				this.#delayReject = null;
				this.#delay = undefined;
				resolve();
			}, delay);
		});
	}

	#clearDelay() {
		clearTimeout(this.#delay);
		this.#delay = undefined;
		const reject = this.#delayReject;
		this.#delayReject = null;
		reject?.(new DOMException('Delay cancelled', 'AbortError'));
	}

	#isInteractive() {
		return Object.keys(this.#contentActions ?? {}).length > 0;
	}

	#computeEffectiveActions(
		actions: ContentActions | null,
		selector: string | null
	): ContentActions | null {
		return !selector && actions && !('*' in actions) ? null : actions;
	}

	#enforceContentActionsConstraint(): void {
		const effective = this.#computeEffectiveActions(this.#contentActions, this.#contentSelector);
		if (effective !== this.#contentActions) {
			console.warn(
				'[useTooltip] contentActions keys other than "*" require contentSelector. ' +
					'Non-"*" actions have been cleared.'
			);
			this.#contentActions = null;
		}
	}

	#warnIfNoContent(): void {
		if (!DEV) return;
		if (!this.#content && !this.#contentSelector) {
			console.warn('[useTooltip] No content provided. Set either `content` or `contentSelector`.');
		} else if (this.#contentSelector && !document.querySelector(this.#contentSelector)) {
			console.warn(
				`[useTooltip] contentSelector "${this.#contentSelector}" matched no element in the DOM.`
			);
		}
	}

	#contentHasFocusableElements(): boolean {
		if (!this.#contentSelector) return false;
		const el = document.querySelector(this.#contentSelector);
		if (!el) return false;
		const root = el instanceof HTMLTemplateElement ? el.content : el;
		return root.querySelector(Tooltip.#FOCUSABLE_SELECTOR) !== null;
	}

	#setupFocusTrap(): void {
		const focusable = this.#tooltip!.querySelectorAll<HTMLElement>(Tooltip.#FOCUSABLE_SELECTOR);
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
		this.#tooltip!.setAttribute('aria-modal', 'true');
	}

	#syncTabIndex(): void {
		if (this.#isInteractive() && this.#contentHasFocusableElements()) {
			this.#applyTabIndex();
		} else {
			this.#restoreTabIndex();
		}
	}

	#applyTabIndex(): void {
		if (this.#target && !this.#target.hasAttribute('tabindex')) {
			this.#target.setAttribute('tabindex', '0');
			this.#addedTabIndex = true;
		}
	}

	#restoreTabIndex(): void {
		if (this.#addedTabIndex) {
			this.#target?.removeAttribute('tabindex');
			this.#addedTabIndex = false;
		}
	}

	#teardownFocusTrap(): void {
		if (this.#trapHandler) {
			this.#tooltip?.removeEventListener('keydown', this.#trapHandler);
			this.#tooltip?.removeAttribute('aria-modal');
			this.#trapHandler = null;
			// Temporarily remove show-event listeners so that returning focus to the trigger
			// does not re-open the tooltip.
			const { toggleEvents, showOnlyEvents } = this.#partitionEvents();
			if (this.#boundEnterHandler) {
				showOnlyEvents.forEach((evt) =>
					this.#target?.removeEventListener(evt, this.#boundEnterHandler!)
				);
			}
			if (this.#boundToggleHandler) {
				toggleEvents.forEach((evt) =>
					this.#target?.removeEventListener(evt, this.#boundToggleHandler!)
				);
			}
			this.#target?.focus();
			if (this.#boundEnterHandler) {
				showOnlyEvents.forEach((evt) =>
					this.#target?.addEventListener(evt, this.#boundEnterHandler!)
				);
			}
			if (this.#boundToggleHandler) {
				toggleEvents.forEach((evt) =>
					this.#target?.addEventListener(evt, this.#boundToggleHandler!)
				);
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
			try {
				await this.#waitForDelay(this.#enterDelay);
			} catch {
				return;
			}
			await this.#appendTooltipToTarget();
			await standby(0);
			this.#onEnter?.();
		}
	}

	async #scheduleHide() {
		// For interactive portal tooltips, guarantee at least one animation frame so the
		// mouseenter on the tooltip can fire and cancel this hide via #clearDelay().
		const delay =
			this.#portal && this.#isInteractive()
				? Math.max(this.#leaveDelay, Tooltip.#PORTAL_HOVER_BRIDGE_MS)
				: this.#leaveDelay;
		try {
			await this.#waitForDelay(delay);
		} catch {
			return;
		}
		if (this.#tooltipHovered) return;
		await this.#removeTooltipFromTarget();
		await standby(0);
		this.#onLeave?.();
	}

	async #onTargetLeave(e: Event) {
		if (this.#open) return;
		if (e.type === 'focusout') {
			const relatedTarget = (e as FocusEvent).relatedTarget as Node;
			if (
				this.#target?.contains(relatedTarget) ||
				(this.#portal && this.#tooltip?.contains(relatedTarget))
			)
				return;
		}
		if (this.#target === e.target || !this.#target?.contains(e.target as Node)) {
			await this.#scheduleHide();
		}
	}

	async #onTargetToggle(e: Event) {
		if (this.#tooltip?.parentNode) {
			await this.#onTargetLeave(e);
		} else {
			await this.#onTargetEnter(e);
		}
	}

	async #onWindowChange(e: Event) {
		if (!this.#tooltip || !this.#tooltip.parentNode) return;

		if (e.type === 'resize' || e.type === 'scroll') {
			this.#positionTooltip();
			return;
		}

		// Reposition is always allowed; close events are blocked when open is locked.
		if (this.#open) return;

		const ke = e as KeyboardEvent;
		const touchTarget = e.target as Node;
		if (
			(e.type !== 'keydown' || ke.key === 'Escape' || ke.key === 'Esc') &&
			(e.type !== 'touchstart' ||
				(!this.#target?.contains(touchTarget) &&
					!(this.#portal && this.#tooltip?.contains(touchTarget))))
		) {
			await this.#removeTooltipFromTarget();
			this.#onLeave?.();
		}
	}

	async #onTouchToggle(_e: Event) {
		if (this.#tooltip?.parentNode) {
			try {
				await this.#waitForDelay(this.#leaveDelay);
			} catch {
				return;
			}
			await this.#removeTooltipFromTarget();
			await standby(0);
			this.#onLeave?.();
		} else {
			try {
				await this.#waitForDelay(this.#enterDelay);
			} catch {
				return;
			}
			await this.#appendTooltipToTarget();
			await standby(0);
			this.#onEnter?.();
		}
	}
}

export default Tooltip;
