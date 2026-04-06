import { afterEach, beforeEach, expect, describe, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { createElement } from '@untemps/utils/dom/createElement';
import { getElement } from '@untemps/utils/dom/getElement';
import { removeElement } from '@untemps/utils/dom/removeElement';
import { standby } from '@untemps/utils/async/standby';

import useTooltip from '../useTooltip';
import type { TooltipOptions } from '../useTooltip';
import Tooltip from '../Tooltip';
import type { ContentAction, ContentActions } from '../Tooltip';

type FullAction = { update: (params: TooltipOptions) => void; destroy: () => Promise<void> };
type BoundContentAction = ContentAction & { callbackParams: unknown[] };
type FixtureOptions = TooltipOptions & { contentActions: Record<string, BoundContentAction> };

const initTarget = (id: string): HTMLElement => {
	return createElement({ tag: 'div', attributes: { id, class: 'bar' }, parent: document.body });
};

const initTemplate = (id: string, contentId: string): void => {
	const template = createElement({ tag: 'template', attributes: { id }, parent: document.body });
	createElement({
		tag: 'div',
		attributes: { id: contentId, class: 'foo' },
		// DocumentFragment (template.content) is not an HTMLElement subtype — double-cast via
		// unknown to satisfy the third-party createElement API that expects HTMLElement as parent
		parent: (template as HTMLTemplateElement).content as unknown as HTMLElement
	});
};

const createAction = (node: HTMLElement, opts: TooltipOptions): FullAction =>
	useTooltip(node, opts) as FullAction;

const tooltipEl = (): HTMLElement => (getElement('#content') as Element).parentNode as HTMLElement;

describe('useTooltip', () => {
	let target: HTMLElement;
	let options: FixtureOptions;
	let action: FullAction | null = null;

	beforeEach(() => {
		target = initTarget('target');
		initTemplate('template', 'content');
		options = {
			contentSelector: '#template',
			contentActions: {
				'*': {
					eventType: 'click',
					callback: vi.fn(() => 0),
					callbackParams: ['foo']
				}
			}
		};
	});

	afterEach(() => {
		action?.destroy();
		action = null;

		removeElement('#target');
		removeElement('#template');

		Tooltip.destroy();
	});

	describe('useTooltip interactions', () => {
		describe('init', () => {
			test('Shows tooltip on mouse enter', async () => {
				action = createAction(target, options);
				await _enter(target);
				expect(target).toHaveStyle('position: relative');
				expect(target).toHaveAttribute('aria-describedby');
				expect(getElement('#content')).toBeInTheDocument();
			});

			test('Hides tooltip on mouse leave', async () => {
				action = createAction(target, options);
				await _enterAndLeave(target);
				expect(getElement('#content')).not.toBeInTheDocument();
			});

			test('Hides tooltip on escape key down', async () => {
				action = createAction(target, options);
				await _enter(target);
				await _keyDown(target);
				expect(getElement('#content')).not.toBeInTheDocument();
			});
		});
	});

	describe('useTooltip inline styles preservation', () => {
		test('Preserves existing inline styles on the target element after init', () => {
			target.style.fontSize = '14px';
			action = createAction(target, { content: 'tooltip' });
			expect(target).toHaveStyle('font-size: 14px');
			expect(target).toHaveStyle('position: relative');
		});

		test('Preserves existing inline styles on template child after cloning', async () => {
			const template = document.querySelector('#template') as HTMLTemplateElement;
			const child = template.content.firstElementChild as HTMLElement;
			child.style.fontSize = '14px';

			action = createAction(target, options);
			await _enter(target);

			const cloned = getElement('#content');
			expect(cloned).toHaveStyle('font-size: 14px');
			expect(cloned).toHaveStyle('position: relative');
		});
	});

	describe('useTooltip lifecycle', () => {
		test('Destroys tooltip', async () => {
			action = createAction(target, options);
			action.destroy();
			expect(target).not.toHaveStyle('position: relative');
			expect(target).not.toHaveAttribute('aria-describedby');
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Removes window event listeners on destroy', async () => {
			action = createAction(target, options);
			const spy = vi.spyOn(window, 'removeEventListener');
			await action.destroy();
			expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
			expect(spy).toHaveBeenCalledWith('resize', expect.any(Function));
			expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function));
			spy.mockRestore();
		});

		test('Restores original title attribute on destroy', async () => {
			target.setAttribute('title', 'original title');
			action = createAction(target, { content: 'tooltip' });
			expect(target).not.toHaveAttribute('title', 'original title');
			await action.destroy();
			expect(target).toHaveAttribute('title', 'original title');
		});

		test('Does not set title attribute on destroy if target had none', async () => {
			action = createAction(target, { content: 'tooltip' });
			await action.destroy();
			expect(target).not.toHaveAttribute('title');
		});
	});

	describe('useTooltip props: content', () => {
		test('Displays text content', async () => {
			const content = 'Foo';
			action = createAction(target, {
				...options,
				contentSelector: null,
				content
			});
			await _enter(target);
			expect(target).toHaveTextContent(content);
		});

		test('Displays content element over text', async () => {
			const content = 'Foo';
			action = createAction(target, {
				...options,
				content
			});
			await _enter(target);
			expect(target).not.toHaveTextContent(content);
			expect(getElement('#content')).toBeInTheDocument();
		});
	});

	describe('useTooltip props: contentActions', () => {
		test('Triggers callback on tooltip click', async () => {
			action = createAction(target, options);
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content as Element);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).toBeInTheDocument();
		});

		test('Closes tooltip after triggering callback', async () => {
			action = createAction(target, options);
			options.contentActions['*'].closeOnCallback = true;
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const tooltip = tooltipEl();
			const content = getElement('#content');
			await fireEvent.click(content as Element);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).not.toBeInTheDocument();
			await fireEvent.animationEnd(tooltip);
			expect(content).not.toBeInTheDocument();
		});

		test('Closes tooltip after triggering callback when animated', async () => {
			action = createAction(target, { ...options, animated: true });
			options.contentActions['*'].closeOnCallback = true;
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const tooltip = tooltipEl();
			const content = getElement('#content');
			await fireEvent.click(content as Element);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(tooltip);
			expect(content).not.toBeInTheDocument();
		});

		test('Triggers new callback on tooltip click after update', async () => {
			action = createAction(target, options);
			const newCallback = vi.fn(() => 0);
			const newOptions: FixtureOptions = {
				...options,
				contentActions: {
					'*': {
						eventType: 'click',
						callback: newCallback,
						callbackParams: ['foo', 'bar']
					}
				}
			};
			const contentAction = newOptions.contentActions['*'];
			action.update(newOptions);
			await _enter(target);
			await fireEvent.click(getElement('#content') as Element);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				contentAction.callbackParams[1],
				expect.any(Event)
			);
		});
	});

	describe('useTooltip props: containerClassName', () => {
		test('Sets tooltip default class', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip');
		});

		test('Updates tooltip class', async () => {
			action = createAction(target, options);
			action.update({
				containerClassName: '__custom-tooltip'
			});
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__custom-tooltip');
		});

		test('Sets tooltip custom class', async () => {
			action = createAction(target, { ...options, containerClassName: '__custom-tooltip' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__custom-tooltip');
		});
	});

	describe('useTooltip props: disabled', () => {
		test('Disables tooltip', async () => {
			action = createAction(target, {
				...options,
				disabled: true
			});
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Disables tooltip after update', async () => {
			action = createAction(target, options);
			action.update({
				disabled: true
			});
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Enables tooltip after update', async () => {
			action = createAction(target, {
				...options,
				disabled: true
			});
			action.update({
				disabled: false
			});
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
		});
	});

	describe('useTooltip props: position', () => {
		beforeEach(() => {
			Object.defineProperty(document.documentElement, 'clientWidth', {
				get: () => 10000,
				configurable: true
			});
			Object.defineProperty(document.documentElement, 'clientHeight', {
				get: () => 10000,
				configurable: true
			});
			vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
				top: 500,
				bottom: 550,
				left: 500,
				right: 600,
				width: 100,
				height: 50,
				x: 0,
				y: 0
			} as DOMRect);
		});

		afterEach(() => {
			vi.restoreAllMocks();
			Object.defineProperty(document.documentElement, 'clientWidth', {
				get: () => 0,
				configurable: true
			});
			Object.defineProperty(document.documentElement, 'clientHeight', {
				get: () => 0,
				configurable: true
			});
		});

		test('Positions tooltip on the left', async () => {
			action = createAction(target, {
				...options,
				position: 'left'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).toHaveClass('__tooltip-left');
		});

		test('Positions tooltip on the left after update', async () => {
			action = createAction(target, options);
			action.update({
				position: 'left'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).not.toHaveClass('__tooltip-top');
			expect(tooltip).toHaveClass('__tooltip-left');
		});

		test('Positions tooltip on the right', async () => {
			action = createAction(target, {
				...options,
				position: 'right'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).toHaveLength(0);
			expect(tooltip.style.right).not.toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).toHaveClass('__tooltip-right');
		});

		test('Positions tooltip on the right after update', async () => {
			action = createAction(target, options);
			action.update({
				position: 'right'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).toHaveLength(0);
			expect(tooltip.style.right).not.toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).not.toHaveClass('__tooltip-top');
			expect(tooltip).toHaveClass('__tooltip-right');
		});

		test('Positions tooltip at the top', async () => {
			action = createAction(target, options);
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).toHaveClass('__tooltip-top');
		});

		test('Positions tooltip at the top after update', async () => {
			action = createAction(target, {
				...options,
				position: 'left'
			});
			action.update({
				position: 'top'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).not.toHaveLength(0);
			expect(tooltip.style.bottom).toHaveLength(0);
			expect(tooltip).not.toHaveClass('__tooltip-left');
			expect(tooltip).toHaveClass('__tooltip-top');
		});

		test('Positions tooltip at the bottom', async () => {
			action = createAction(target, {
				...options,
				position: 'bottom'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).toHaveLength(0);
			expect(tooltip.style.bottom).not.toHaveLength(0);
			expect(tooltip).toHaveClass('__tooltip-bottom');
		});

		test('Positions tooltip at the bottom after update', async () => {
			action = createAction(target, options);
			action.update({
				position: 'bottom'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip.style.left).not.toHaveLength(0);
			expect(tooltip.style.right).toHaveLength(0);
			expect(tooltip.style.top).toHaveLength(0);
			expect(tooltip.style.bottom).not.toHaveLength(0);
			expect(tooltip).not.toHaveClass('__tooltip-top');
			expect(tooltip).toHaveClass('__tooltip-bottom');
		});
	});

	describe('useTooltip props: position (boundary placement)', () => {
		const VW = 1024;
		const VH = 768;

		const mockRects = (targetRect: Partial<DOMRect>, tooltipRect: Partial<DOMRect>) => {
			Object.defineProperty(document.documentElement, 'clientWidth', {
				get: () => VW,
				configurable: true
			});
			Object.defineProperty(document.documentElement, 'clientHeight', {
				get: () => VH,
				configurable: true
			});
			vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
				this: HTMLElement
			) {
				if (this === target) return { ...targetRect } as DOMRect;
				return { ...tooltipRect } as DOMRect;
			});
		};

		afterEach(() => {
			vi.restoreAllMocks();
			Object.defineProperty(document.documentElement, 'clientWidth', {
				get: () => 0,
				configurable: true
			});
			Object.defineProperty(document.documentElement, 'clientHeight', {
				get: () => 0,
				configurable: true
			});
		});

		// — No overflow: declared position used as-is —

		test('Uses declared top when there is sufficient space above', async () => {
			mockRects(
				{ top: 200, bottom: 220, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'top' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-top');
		});

		test('Uses declared bottom when there is sufficient space below', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'bottom' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-bottom');
		});

		test('Uses declared left when there is sufficient space to the left', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 200, right: 300, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-left');
		});

		test('Uses declared right when there is sufficient space to the right', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'right' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-right');
		});

		// — Overflow: best available position selected (most space) —

		test('Switches to the position with most available space when declared top overflows', async () => {
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'top' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-right');
			expect(tooltipEl()).not.toHaveClass('__tooltip-top');
		});

		test('Switches to bottom (not just opposite) when it has the most space', async () => {
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 900, height: 30 }
			);
			action = createAction(target, { ...options, position: 'top' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-bottom');
			expect(tooltipEl()).not.toHaveClass('__tooltip-top');
		});

		test('Switches left to right when right has more space and fits', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 5, right: 105, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left', width: '80px' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-right');
			expect(tooltipEl()).not.toHaveClass('__tooltip-left');
		});

		test('Switches right to left when left has more space and fits', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: VW - 105, right: VW - 5, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = createAction(target, { ...options, position: 'right', width: '80px' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-left');
			expect(tooltipEl()).not.toHaveClass('__tooltip-right');
		});

		// — Width adaptation (width: auto) —

		test('Adapts width to available space and keeps declared left when space >= MIN_WIDTH', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 150, right: 250, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left' });
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('__tooltip-left');
			expect(tooltip.style.width).toBe('140px');
		});

		test('Adapts width to available space and keeps declared right when space >= MIN_WIDTH', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 800, right: 900, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = createAction(target, { ...options, position: 'right' });
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('__tooltip-right');
			expect(tooltip.style.width).toBe('114px');
		});

		test('Switches position when available space is below MIN_WIDTH and width is auto', async () => {
			// space.left=40 < MIN_WIDTH(80); cannot adapt; best alternative: right(874>=80) → right
			mockRects(
				{ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left' });
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('__tooltip-right');
			expect(tooltip).not.toHaveClass('__tooltip-left');
		});

		test('Does not adapt width when width prop is explicitly set', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left', width: '200px' });
			await _enter(target);
			expect(tooltipEl()).not.toHaveClass('__tooltip-left');
		});

		test('Adapts width of the best alternative position when all positions overflow', async () => {
			mockRects(
				{ top: 5, bottom: 200, left: 100, right: 200, width: 100, height: 195 },
				{ width: 900, height: 600 }
			);
			action = createAction(target, { ...options, position: 'top' });
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('__tooltip-right');
			expect(tooltip.style.width).toBe('814px');
		});

		// — Class and state management —

		test('Does not mutate class when containerClassName is set', async () => {
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 900, height: 30 }
			);
			action = createAction(target, {
				...options,
				position: 'top',
				containerClassName: 'my-tooltip'
			});
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('my-tooltip');
			expect(tooltip).not.toHaveClass('__tooltip-bottom');
		});

		test('Resets class and width after tooltip is hidden', async () => {
			// First show: left overflows → width adapted to available space
			mockRects(
				{ top: 100, bottom: 120, left: 150, right: 250, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = createAction(target, { ...options, position: 'left' });
			await _enter(target);
			expect(tooltipEl().style.width).toBe('140px');
			await _leave(target);

			vi.restoreAllMocks();
			mockRects(
				{ top: 100, bottom: 120, left: 300, right: 400, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			await _enter(target);
			const tooltip = tooltipEl();
			expect(tooltip).toHaveClass('__tooltip-left');
			expect(tooltip.style.width).toBe('');
		});
	});

	describe('useTooltip props: enterDelay', () => {
		test('Delays tooltip appearance', async () => {
			action = createAction(target, {
				...options,
				enterDelay: 50
			});
			await _enter(target);
			let content = getElement('#content');
			expect(content).toBeNull();
			await standby(100);
			content = getElement('#content');
			expect(content).toBeInTheDocument();
		});

		test('Delays tooltip disappearance after update', async () => {
			action = createAction(target, options);
			action.update({
				enterDelay: 150
			});
			await _enter(target);
			await standby(100);
			let content = getElement('#content');
			expect(content).toBeNull();
			await standby(100);
			content = getElement('#content');
			expect(content).toBeInTheDocument();
		});
	});

	describe('useTooltip props: onEnter', () => {
		test('Triggers callback when entering tooltip', async () => {
			const onEnter = vi.fn(() => 0);
			action = createAction(target, {
				...options,
				onEnter
			});
			await _enter(target);
			await standby(0);
			expect(onEnter).toHaveBeenCalled();
		});

		test('Triggers callback when entering tooltip after update', async () => {
			const onEnter = vi.fn(() => 0);
			action = createAction(target, options);
			action.update({
				onEnter
			});
			await _enter(target);
			await standby(0);
			expect(onEnter).toHaveBeenCalled();
		});
	});

	describe('useTooltip props: leaveDelay', () => {
		test('Delays tooltip disappearance', async () => {
			action = createAction(target, {
				...options,
				leaveDelay: 50
			});
			await _enterAndLeave(target);
			const content = getElement('#content');
			expect(content).toBeInTheDocument();
			await standby(100);
			expect(content).not.toBeInTheDocument();
		});

		test('Delays tooltip disappearance after update', async () => {
			action = createAction(target, options);
			action.update({
				leaveDelay: 150
			});
			await _enterAndLeave(target);
			await standby(100);
			const content = getElement('#content');
			expect(content).toBeInTheDocument();
			await standby(100);
			expect(content).not.toBeInTheDocument();
		});
	});

	describe('useTooltip props: width', () => {
		test('Sets tooltip width', async () => {
			action = createAction(target, {
				...options,
				width: '200px'
			});
			await _enter(target);
			expect(tooltipEl().style.width).toBe('200px');
		});

		test('Does not set width when value is auto', async () => {
			action = createAction(target, {
				...options,
				width: 'auto'
			});
			await _enter(target);
			expect(tooltipEl().style.width).toHaveLength(0);
		});

		test('Does not set width when value is not provided', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(tooltipEl().style.width).toHaveLength(0);
		});

		test('Sets tooltip width after update', async () => {
			action = createAction(target, options);
			action.update({
				width: '300px'
			});
			await _enter(target);
			expect(tooltipEl().style.width).toBe('300px');
		});

		test('Removes tooltip width after update to auto', async () => {
			action = createAction(target, {
				...options,
				width: '200px'
			});
			action.update({
				width: 'auto'
			});
			await _enter(target);
			expect(tooltipEl().style.width).toHaveLength(0);
		});

		test('Does not change width when not passed in update', async () => {
			action = createAction(target, {
				...options,
				width: '200px'
			});
			action.update({});
			await _enter(target);
			expect(tooltipEl().style.width).toBe('200px');
		});
	});

	describe('useTooltip props: animated', () => {
		test('Animates tooltip disappearance', async () => {
			action = createAction(target, {
				...options,
				animated: true
			});
			await _enterAndLeave(target);
			const content = getElement('#content');
			const tooltip = tooltipEl();
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(tooltip);
			expect(content).not.toBeInTheDocument();
		});

		test('Animates tooltip disappearance after update', async () => {
			action = createAction(target, options);
			action.update({
				animated: true
			});
			await _enterAndLeave(target);
			const content = getElement('#content');
			const tooltip = tooltipEl();
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(tooltip);
			expect(content).not.toBeInTheDocument();
		});
	});
});
