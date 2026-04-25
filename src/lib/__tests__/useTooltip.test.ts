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

// Creates a <template> whose firstElementChild is a <div> wrapper containing `count` elements
// of `childTag` with class `childClass`. Used to test querySelectorAll-based listener binding.
const initMultiTemplate = (
	id: string,
	childTag: string,
	childClass: string,
	count: number
): void => {
	const template = createElement({ tag: 'template', attributes: { id }, parent: document.body });
	const wrapper = createElement({
		tag: 'div',
		parent: (template as HTMLTemplateElement).content as unknown as HTMLElement
	});
	for (let i = 0; i < count; i++) {
		createElement({ tag: childTag, attributes: { class: childClass }, parent: wrapper });
	}
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
		removeElement('#multi-template');

		Tooltip.destroy();
	});

	describe('useTooltip interactions', () => {
		describe('init', () => {
			test('Shows tooltip on mouse enter', async () => {
				action = createAction(target, options);
				await _enter(target);
				expect(target).toHaveStyle('position: relative');
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
			const template = getElement('#template') as HTMLTemplateElement;
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

		test('Repositions tooltip on scroll inside a scrollable ancestor container', async () => {
			const container = createElement({
				tag: 'div',
				attributes: { id: 'container' },
				parent: document.body
			});
			container.style.overflowY = 'auto';
			container.appendChild(target);

			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();

			const spy = vi.spyOn(target, 'getBoundingClientRect');
			await fireEvent.scroll(container);
			expect(getElement('#content')).toBeInTheDocument();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();

			await action.destroy();
			action = null;
			removeElement('#container');
		});

		test('Does not remove tooltip on scroll inside a non-scrollable ancestor container', async () => {
			const container = createElement({
				tag: 'div',
				attributes: { id: 'container' },
				parent: document.body
			});
			// No overflow set — default is visible on both axes, not a scroll container
			container.appendChild(target);

			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();

			await fireEvent.scroll(container);
			expect(getElement('#content')).toBeInTheDocument();

			await action.destroy();
			action = null;
			removeElement('#container');
		});

		test('Repositions tooltip on window resize', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();

			const spy = vi.spyOn(target, 'getBoundingClientRect');
			await fireEvent.resize(window);
			expect(getElement('#content')).toBeInTheDocument();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		test('Repositions tooltip on window scroll', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();

			const spy = vi.spyOn(target, 'getBoundingClientRect');
			await fireEvent.scroll(window);
			expect(getElement('#content')).toBeInTheDocument();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		test('Does not throw when window resize fires with no active tooltip', async () => {
			action = createAction(target, options);
			// Tooltip is not shown — parentNode guard must swallow the event silently
			await expect(fireEvent.resize(window)).resolves.not.toThrow();
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Removes ancestor scroll listeners on destroy', async () => {
			const container = createElement({
				tag: 'div',
				attributes: { id: 'container' },
				parent: document.body
			});
			container.style.overflowY = 'auto';
			container.appendChild(target);

			action = createAction(target, options);
			const spy = vi.spyOn(container, 'removeEventListener');
			await action.destroy();
			expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function));
			spy.mockRestore();

			action = null;
			removeElement('#container');
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

		test('Removes instance from static registry on individual destroy', async () => {
			const target2 = initTarget('target2');
			const action2 = createAction(target2, { content: 'tooltip2' });
			action = createAction(target, options);

			// Destroy action2 individually — it should be pruned from #instances
			await action2.destroy();

			// Tooltip.destroy() should cleanly destroy remaining instances (only action)
			// without double-destroying action2 — verified by absence of errors and
			// correct cleanup of action's target
			Tooltip.destroy();

			expect(target).not.toHaveAttribute('aria-describedby');
			expect(target2).not.toHaveAttribute('aria-describedby');

			removeElement('#target2');
		});

		test('Does not apply update after destroy', async () => {
			action = createAction(target, options);
			await action.destroy();
			// update() on a destroyed instance must be a no-op — no error thrown
			expect(() => action!.update({ content: 'new content' })).not.toThrow();
		});

		test('Does not set up content when destroyed before contentSelector resolves', async () => {
			// Remove template so the observer waits for it to appear
			removeElement('#template');
			action = createAction(target, { contentSelector: '#template' });

			// Destroy while observer is still pending
			await action.destroy();
			action = null;

			// Now add the template — would trigger the observer callback if not guarded
			initTemplate('template', 'content');
			await standby(10);

			// Guard must have blocked content setup
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Does not duplicate content when structure rebuilds while contentSelector observer is pending', async () => {
			// Remove template so the observer waits for it to appear dynamically
			removeElement('#template');
			action = createAction(target, { contentSelector: '#template' });

			// Trigger a structure rebuild before the template appears
			action.update({ contentSelector: '#template', position: 'bottom' });

			// Now add the template — only the observer registered after the rebuild should fire
			initTemplate('template', 'content');
			await standby(10);

			await _enter(target);
			const tooltipEl = target.querySelector('[role="tooltip"]')!;
			expect(tooltipEl.querySelectorAll('#content')).toHaveLength(1);
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

		test('Triggers all callbacks when an array of actions is provided for a selector', async () => {
			const clickCallback = vi.fn();
			const mouseenterCallback = vi.fn();
			action = createAction(target, {
				...options,
				contentActions: {
					// '*' attaches listeners directly on the tooltip container
					'*': [
						{ eventType: 'click', callback: clickCallback, callbackParams: [] },
						{ eventType: 'mouseenter', callback: mouseenterCallback, callbackParams: [] }
					]
				}
			});
			await _enter(target);
			const tooltip = tooltipEl();
			await fireEvent.click(tooltip);
			expect(clickCallback).toHaveBeenCalledTimes(1);
			expect(mouseenterCallback).not.toHaveBeenCalled();
			await fireEvent.mouseEnter(tooltip);
			expect(mouseenterCallback).toHaveBeenCalledTimes(1);
		});

		test('Closes tooltip on closeOnCallback in array when triggered', async () => {
			const closeCallback = vi.fn();
			const otherCallback = vi.fn();
			action = createAction(target, {
				...options,
				contentActions: {
					'*': [
						{
							eventType: 'click',
							callback: closeCallback,
							callbackParams: [],
							closeOnCallback: true
						},
						{ eventType: 'mouseenter', callback: otherCallback, callbackParams: [] }
					]
				}
			});
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content as Element);
			expect(closeCallback).toHaveBeenCalledTimes(1);
			expect(content).not.toBeInTheDocument();
		});

		test('Removes all listeners from array actions on tooltip close', async () => {
			const clickCallback = vi.fn();
			const mouseenterCallback = vi.fn();
			action = createAction(target, {
				...options,
				contentActions: {
					'*': [
						{ eventType: 'click', callback: clickCallback, callbackParams: [] },
						{ eventType: 'mouseenter', callback: mouseenterCallback, callbackParams: [] }
					]
				}
			});
			await _enter(target);
			await _leave(target);
			// After tooltip closes, re-open and check callbacks are fresh (not double-registered)
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content as Element);
			expect(clickCallback).toHaveBeenCalledTimes(1);
		});

		test('Attaches listeners to all elements matching a class selector, not just the first', async () => {
			initMultiTemplate('multi-template', 'button', 'btn', 2);
			const clickCallback = vi.fn();
			action = createAction(target, {
				contentSelector: '#multi-template',
				contentActions: {
					'.btn': { eventType: 'click', callback: clickCallback, callbackParams: [] }
				}
			});
			await _enter(target);
			const tooltip = target.querySelector<HTMLElement>('[role="dialog"]')!;
			const buttons = tooltip.querySelectorAll<HTMLElement>('.btn');
			expect(buttons).toHaveLength(2);
			await fireEvent.click(buttons[0]);
			await fireEvent.click(buttons[1]);
			expect(clickCallback).toHaveBeenCalledTimes(2);
		});

		test('Triggers mouseenter on each element individually when using a class selector', async () => {
			initMultiTemplate('multi-template', 'button', 'btn', 2);
			const mouseenterCallback = vi.fn();
			action = createAction(target, {
				contentSelector: '#multi-template',
				contentActions: {
					// mouseenter does not bubble — the listener must be on each element directly
					'.btn': { eventType: 'mouseenter', callback: mouseenterCallback, callbackParams: [] }
				}
			});
			await _enter(target);
			const tooltip = target.querySelector<HTMLElement>('[role="dialog"]')!;
			const buttons = tooltip.querySelectorAll<HTMLElement>('.btn');
			await fireEvent.mouseEnter(buttons[0]);
			await fireEvent.mouseEnter(buttons[1]);
			expect(mouseenterCallback).toHaveBeenCalledTimes(2);
		});
	});

	describe('useTooltip props: contentActions semantics', () => {
		test('Non-"*" contentActions without contentSelector are cleared and a warning is emitted', async () => {
			const callback = vi.fn();
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			action = createAction(target, {
				contentActions: { '#btn': { eventType: 'click', callback, callbackParams: [] } }
			});
			await _enter(target);
			const tooltip = target.querySelector('[role="tooltip"]')!;
			await fireEvent.click(tooltip);
			expect(callback).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"*"'));
			warnSpy.mockRestore();
		});

		test('"*" contentActions without contentSelector works normally', async () => {
			const callback = vi.fn();
			action = createAction(target, {
				content: 'Hello',
				contentActions: { '*': { eventType: 'click', callback, callbackParams: [] } }
			});
			await _enter(target);
			const tooltip = target.querySelector('[role="dialog"]')!;
			await fireEvent.click(tooltip);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('update() without contentActions preserves existing actions', async () => {
			const callback = vi.fn();
			action = createAction(target, {
				contentSelector: '#template',
				contentActions: { '*': { eventType: 'click', callback, callbackParams: [] } }
			});
			// Partial update — contentActions intentionally absent (undefined)
			action.update({ contentSelector: '#template' });
			await _enter(target);
			const tooltip = target.querySelector('[role="dialog"]')!;
			await fireEvent.click(tooltip);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('update({ contentActions: null }) explicitly clears actions', async () => {
			const callback = vi.fn();
			action = createAction(target, {
				...options,
				contentActions: { '*': { eventType: 'click', callback, callbackParams: [] } }
			});
			action.update({ ...options, contentActions: null });
			await _enter(target);
			const tooltip = target.querySelector('[role="tooltip"]')!;
			await fireEvent.click(tooltip);
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('useTooltip props: partial update', () => {
		test('Partial update preserves content when omitted', async () => {
			action = createAction(target, { content: 'Hello', position: 'top' });
			action.update({ position: 'bottom' });
			await _enter(target);
			const tooltip = target.querySelector('[role="tooltip"]')!;
			expect(tooltip.textContent).toContain('Hello');
		});

		test('Partial update preserves position when omitted', async () => {
			action = createAction(target, { content: 'Hello', position: 'left' });
			action.update({ content: 'Hello' });
			await _enter(target);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();
		});

		test('Partial update with only contentActions: null does not clear content', async () => {
			action = createAction(target, { content: 'Hello' });
			action.update({ contentActions: null });
			await _enter(target);
			const tooltip = target.querySelector('[role="tooltip"]')!;
			expect(tooltip.textContent).toContain('Hello');
		});

		test('Partial update preserves open lock when open is omitted', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();

			// update without open — lock must be preserved
			action.update({ content: 'Hello' });
			await _leave(target);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();
		});

		test('open: false releases lock even when other props are preserved', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();

			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(target.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
		});

		test('Below-minimum offset does not trigger a rebuild on repeated updates', async () => {
			action = createAction(target, { content: 'Hello', offset: 3 });
			await _enter(target);
			const tooltipBefore = target.querySelector('[role="tooltip"]');
			// Second update with the same below-minimum value — effective offset unchanged (clamped to 5)
			action.update({ content: 'Hello', offset: 3 });
			const tooltipAfter = target.querySelector('[role="tooltip"]');
			expect(tooltipAfter).toBe(tooltipBefore);
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

		test('Hides tooltip immediately when disabled via update while visible', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			action.update({ disabled: true });
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Partial update without disabled keeps a disabled tooltip disabled', async () => {
			action = createAction(target, { ...options, disabled: true });
			// update without disabled — must not re-enable
			action.update({ contentSelector: '#template' });
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Partial update without disabled keeps an enabled tooltip enabled', async () => {
			action = createAction(target, options);
			action.update({ contentSelector: '#template' });
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

		test('Triggers callback when tooltip opens programmatically via open: true', async () => {
			const onEnter = vi.fn(() => 0);
			action = createAction(target, { ...options, onEnter });
			action.update({ open: true });
			await standby(1);
			expect(onEnter).toHaveBeenCalled();
		});
	});

	describe('useTooltip props: onLeave', () => {
		test('Triggers callback when leaving tooltip', async () => {
			const onLeave = vi.fn(() => 0);
			action = createAction(target, { ...options, onLeave });
			await _enter(target);
			await _leave(target);
			await standby(0);
			expect(onLeave).toHaveBeenCalled();
		});

		test('Triggers callback when Escape key closes the tooltip', async () => {
			const onLeave = vi.fn(() => 0);
			action = createAction(target, { ...options, onLeave });
			await _enter(target);
			await _keyDown(target);
			await standby(0);
			expect(onLeave).toHaveBeenCalled();
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

		test('Falls back to __tooltip-enter when animationEnterClassName is reset to empty string via update', async () => {
			action = createAction(target, {
				...options,
				animated: true,
				animationEnterClassName: 'my-enter'
			});
			action.update({ ...options, animated: true, animationEnterClassName: '' });
			await _enter(target);
			expect(tooltipEl()).toHaveClass('__tooltip-enter');
		});

		test('Falls back to __tooltip-leave when animationLeaveClassName is reset to empty string via update', async () => {
			action = createAction(target, {
				...options,
				animated: true,
				animationLeaveClassName: 'my-leave'
			});
			action.update({ ...options, animated: true, animationLeaveClassName: '' });
			await _enterAndLeave(target);
			expect(tooltipEl()).toHaveClass('__tooltip-leave');
		});

		test('Cancels animation timeout on destroy and removes tooltip immediately', async () => {
			vi.useFakeTimers();
			try {
				action = createAction(target, { ...options, animated: true });

				await fireEvent.mouseOver(target);
				await fireEvent.mouseEnter(target);
				await vi.advanceTimersByTimeAsync(10);

				await fireEvent.mouseLeave(target);
				await vi.advanceTimersByTimeAsync(10);

				// Animation timer is running — destroy must complete without advancing timers
				await action.destroy();
				action = null;

				expect(getElement('#content')).not.toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});

		test('Removes tooltip via timeout fallback when animationend never fires', async () => {
			vi.useFakeTimers();
			try {
				action = createAction(target, { ...options, animated: true });

				await fireEvent.mouseOver(target);
				await fireEvent.mouseEnter(target);
				await vi.advanceTimersByTimeAsync(10);

				expect(getElement('#content')).toBeInTheDocument();

				await fireEvent.mouseLeave(target);
				await vi.advanceTimersByTimeAsync(10);

				expect(getElement('#content')).toBeInTheDocument();

				await vi.advanceTimersByTimeAsync(1000);

				expect(getElement('#content')).not.toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});

		test('Removes tooltip immediately when prefers-reduced-motion: reduce is active (animationend fires via near-zero duration)', async () => {
			// Simulate prefers-reduced-motion: reduce — the near-zero animation-duration
			// (0.001ms) fires animationend immediately instead of suppressing it with
			// animation: none, which would leave the tooltip stuck for 1 s (timeout fallback).
			vi.useFakeTimers();
			try {
				action = createAction(target, { ...options, animated: true });

				await fireEvent.mouseOver(target);
				await fireEvent.mouseEnter(target);
				await vi.advanceTimersByTimeAsync(10);

				expect(getElement('#content')).toBeInTheDocument();

				await fireEvent.mouseLeave(target);
				await vi.advanceTimersByTimeAsync(10);

				const tooltip = tooltipEl();

				// Simulates the near-instant animationend that 0.001ms duration produces
				await fireEvent.animationEnd(tooltip);

				// Tooltip must be gone before the 1-second timeout fallback fires
				expect(getElement('#content')).not.toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});

		test('Tooltip lingers for 1 s when animation: none suppresses animationend (regression guard)', async () => {
			// Documents the broken behavior that animation: none would produce:
			// animationend never fires so the tooltip only disappears after the timeout fallback.
			// This test must continue to pass — it proves the fallback safety net is intact.
			vi.useFakeTimers();
			try {
				action = createAction(target, { ...options, animated: true });

				await fireEvent.mouseOver(target);
				await fireEvent.mouseEnter(target);
				await vi.advanceTimersByTimeAsync(10);

				// The 1000ms fallback timer starts here, on mouseLeave
				await fireEvent.mouseLeave(target);
				// Advance 10ms to let the leave handler settle; 990ms remain on the fallback timer
				await vi.advanceTimersByTimeAsync(10);

				// animationend never fires (animation: none scenario)
				expect(getElement('#content')).toBeInTheDocument();

				// Still present 1ms before the fallback fires (total elapsed: 10 + 989 = 999ms)
				await vi.advanceTimersByTimeAsync(989);
				expect(getElement('#content')).toBeInTheDocument();

				// Gone once the 1-second fallback fires (total elapsed: 10 + 989 + 1 = 1000ms)
				await vi.advanceTimersByTimeAsync(1);
				expect(getElement('#content')).not.toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('useTooltip props: touchBehavior', () => {
		test('Does not register touch listeners when touchBehavior is not set', async () => {
			const spy = vi.spyOn(target, 'addEventListener');
			action = createAction(target, options);
			const touchEvents = spy.mock.calls
				.map(([event]) => event)
				.filter((e) => e.startsWith('touch'));
			expect(touchEvents).toHaveLength(0);
			spy.mockRestore();
		});

		test('Shows tooltip on touchstart in hover mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Hides tooltip on touchend in hover mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _touchEnd(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Hides tooltip on touchcancel in hover mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _touchCancel(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Shows tooltip on first touchend in toggle mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			await _touchEnd(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Hides tooltip on second touchend on target in toggle mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			await _touchEnd(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _touchEnd(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Hides tooltip on touchstart outside target in toggle mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			await _touchEnd(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _touchStart(document.body);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Does not hide tooltip on touchstart on the target itself in toggle mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			await _touchEnd(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Removes touch listeners on destroy in hover mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			const spy = vi.spyOn(target, 'removeEventListener');
			await action.destroy();
			const touchEvents = spy.mock.calls
				.map(([event]) => event)
				.filter((e) => e.startsWith('touch'));
			expect(touchEvents).toContain('touchstart');
			expect(touchEvents).toContain('touchend');
			expect(touchEvents).toContain('touchcancel');
			spy.mockRestore();
			action = null;
		});

		test('Removes touch listeners on destroy in toggle mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			const spyTarget = vi.spyOn(target, 'removeEventListener');
			const spyWindow = vi.spyOn(window, 'removeEventListener');
			await action.destroy();
			expect(spyTarget.mock.calls.map(([e]) => e)).toContain('touchend');
			expect(spyWindow.mock.calls.map(([e]) => e)).toContain('touchstart');
			spyTarget.mockRestore();
			spyWindow.mockRestore();
			action = null;
		});

		test('Registers touch listeners after update from undefined to hover', async () => {
			action = createAction(target, options);
			const spy = vi.spyOn(target, 'addEventListener');
			action.update({ ...options, touchBehavior: 'hover' });
			const touchEvents = spy.mock.calls
				.map(([event]) => event)
				.filter((e) => e.startsWith('touch'));
			expect(touchEvents).toContain('touchstart');
			expect(touchEvents).toContain('touchend');
			spy.mockRestore();
		});

		test('Shows tooltip on touchstart after update to hover mode', async () => {
			action = createAction(target, options);
			action.update({ ...options, touchBehavior: 'hover' });
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Does not re-wire listeners when touchBehavior is omitted from update', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			const spyAdd = vi.spyOn(target, 'addEventListener');
			const spyRemove = vi.spyOn(target, 'removeEventListener');
			// update() without touchBehavior key — must not touch the existing listeners
			action.update({ ...options });
			const addedTouchEvents = spyAdd.mock.calls
				.map(([e]) => e)
				.filter((e) => e.startsWith('touch'));
			const removedTouchEvents = spyRemove.mock.calls
				.map(([e]) => e)
				.filter((e) => e.startsWith('touch'));
			expect(addedTouchEvents).toHaveLength(0);
			expect(removedTouchEvents).toHaveLength(0);
			spyAdd.mockRestore();
			spyRemove.mockRestore();
			// Hover mode still functional
			await _touchStart(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Switches from hover to toggle mode via update', async () => {
			action = createAction(target, { ...options, touchBehavior: 'hover' });
			const spyAdd = vi.spyOn(window, 'addEventListener');
			action.update({ ...options, touchBehavior: 'toggle' });
			expect(spyAdd.mock.calls.map(([e]) => e)).toContain('touchstart');
			spyAdd.mockRestore();
			await _touchEnd(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Removes window touchstart listener when switching from toggle to hover mode', async () => {
			action = createAction(target, { ...options, touchBehavior: 'toggle' });
			const spyRemove = vi.spyOn(window, 'removeEventListener');
			action.update({ ...options, touchBehavior: 'hover' });
			expect(spyRemove.mock.calls.map(([e]) => e)).toContain('touchstart');
			spyRemove.mockRestore();
		});
	});

	describe('useTooltip props: open', () => {
		test('Shows tooltip programmatically on init when open is true', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Does not show tooltip on init when open is false', async () => {
			action = createAction(target, { content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Shows tooltip programmatically via update', async () => {
			action = createAction(target, { content: 'Hello' });
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			action.update({ content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Hides tooltip programmatically via update', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Toggles tooltip via successive open updates', async () => {
			action = createAction(target, { content: 'Hello' });

			action.update({ content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			action.update({ content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Is a no-op when open is false and tooltip is already hidden', async () => {
			action = createAction(target, { content: 'Hello' });
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Is a no-op when open is true and tooltip is already shown', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			action.update({ content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Preserves normal hover behavior alongside open prop', async () => {
			action = createAction(target, { content: 'Hello' });

			// open via hover
			await _enter(target);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			// close programmatically
			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			// open programmatically
			action.update({ content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			// release open lock via one-shot close — hover events should work again
			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			// verify hover works normally after lock release
			await _enter(target);
			await _leave(target);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Does not show tooltip on init when open is true and disabled is true', async () => {
			action = createAction(target, { content: 'Hello', open: true, disabled: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Does not show tooltip via update when open is true and disabled is true', async () => {
			action = createAction(target, { content: 'Hello' });
			action.update({ content: 'Hello', open: true, disabled: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();
		});

		test('Restores hover after open: false (one-shot close, no lock)', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			action.update({ content: 'Hello', open: false });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).not.toBeInTheDocument();

			// hover must work again — no lock
			await _enter(target);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Keeps tooltip open when open is true and user hovers away', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			await _leave(target);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Keeps tooltip open when open is true and Escape key is pressed', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			await _keyDown(target);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Allows hover after open is false (no lock)', async () => {
			action = createAction(target, { content: 'Hello', open: false });
			await _enter(target);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});

		test('Re-shows tooltip after content update when open is true', async () => {
			action = createAction(target, { content: 'Hello', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();

			// structure change + open: true — tooltip must still be visible after rebuild
			action.update({ content: 'Updated', open: true });
			await standby(1);
			expect(getElement('[role=\"tooltip\"]')).toBeInTheDocument();
		});
	});

	describe('useTooltip aria-describedby', () => {
		test('Sets aria-describedby on the target when tooltip is shown', async () => {
			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			expect(target).toHaveAttribute('aria-describedby');
		});

		test('aria-describedby value matches the tooltip id', async () => {
			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			const tooltip = getElement('[role=\"tooltip\"]') as HTMLElement;
			expect(tooltip.id).toMatch(
				/^tooltip-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
			);
			expect(target.getAttribute('aria-describedby')).toBe(tooltip.id);
		});

		test('Removes aria-describedby from target when tooltip is hidden', async () => {
			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			expect(target).toHaveAttribute('aria-describedby');
			await _leave(target);
			expect(target).not.toHaveAttribute('aria-describedby');
		});

		test('Re-adds aria-describedby when tooltip is shown again', async () => {
			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			await _leave(target);
			await _enter(target);
			expect(target).toHaveAttribute('aria-describedby');
		});

		test('Two tooltip instances have distinct IDs', async () => {
			const target2 = createElement({
				tag: 'div',
				attributes: { id: 'target2' },
				parent: document.body
			});
			const action2 = useTooltip(target2, { content: 'World' }) as FullAction;

			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			await _enter(target2);

			const id1 = target.getAttribute('aria-describedby');
			const id2 = target2.getAttribute('aria-describedby');
			expect(id1).toBeTruthy();
			expect(id2).toBeTruthy();
			expect(id1).not.toBe(id2);

			await action2.destroy();
			removeElement('#target2');
		});

		test('Does not set aria-describedby before tooltip is shown', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('aria-describedby');
		});

		test('Does not set aria-describedby on interactive tooltip', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(target).not.toHaveAttribute('aria-describedby');
		});
	});

	describe('useTooltip aria-expanded', () => {
		const interactiveOptions: TooltipOptions = {
			contentSelector: '#template',
			contentActions: {
				'*': { eventType: 'click', callback: vi.fn(), callbackParams: [] }
			}
		};

		test('Sets aria-expanded="false" on init when tooltip is interactive', () => {
			action = createAction(target, interactiveOptions);
			expect(target).toHaveAttribute('aria-expanded', 'false');
		});

		test('Sets aria-expanded="true" when interactive tooltip is shown', async () => {
			action = createAction(target, interactiveOptions);
			await _enter(target);
			expect(target).toHaveAttribute('aria-expanded', 'true');
		});

		test('Sets aria-expanded="false" when interactive tooltip is hidden', async () => {
			action = createAction(target, interactiveOptions);
			await _enter(target);
			await _leave(target);
			expect(target).toHaveAttribute('aria-expanded', 'false');
		});

		test('Removes aria-expanded on destroy', async () => {
			action = createAction(target, interactiveOptions);
			await action.destroy();
			expect(target).not.toHaveAttribute('aria-expanded');
			action = null;
		});

		test('Does not set aria-expanded when tooltip has no contentActions', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('aria-expanded');
		});

		test('Does not set aria-expanded when contentActions is empty', () => {
			action = createAction(target, { content: 'Hello', contentActions: {} });
			expect(target).not.toHaveAttribute('aria-expanded');
		});

		test('Adds aria-expanded when contentActions is added via update', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('aria-expanded');
			action.update(interactiveOptions);
			expect(target).toHaveAttribute('aria-expanded', 'false');
		});

		test('Removes aria-expanded when contentActions is removed via update', () => {
			action = createAction(target, interactiveOptions);
			expect(target).toHaveAttribute('aria-expanded', 'false');
			action.update({ ...interactiveOptions, contentActions: null });
			expect(target).not.toHaveAttribute('aria-expanded');
		});
	});

	describe('useTooltip aria-haspopup', () => {
		const interactiveOptions: TooltipOptions = {
			contentSelector: '#template',
			contentActions: {
				'*': { eventType: 'click', callback: vi.fn(), callbackParams: [] }
			}
		};

		test('Sets aria-haspopup="dialog" on init when tooltip is interactive', () => {
			action = createAction(target, interactiveOptions);
			expect(target).toHaveAttribute('aria-haspopup', 'dialog');
		});

		test('Removes aria-haspopup on destroy', async () => {
			action = createAction(target, interactiveOptions);
			await action.destroy();
			expect(target).not.toHaveAttribute('aria-haspopup');
			action = null;
		});

		test('Does not set aria-haspopup when tooltip has no contentActions', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('aria-haspopup');
		});

		test('Does not set aria-haspopup when contentActions is empty', () => {
			action = createAction(target, { content: 'Hello', contentActions: {} });
			expect(target).not.toHaveAttribute('aria-haspopup');
		});

		test('Adds aria-haspopup when contentActions is added via update', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('aria-haspopup');
			action.update(interactiveOptions);
			expect(target).toHaveAttribute('aria-haspopup', 'dialog');
		});

		test('Removes aria-haspopup when contentActions is removed via update', () => {
			action = createAction(target, interactiveOptions);
			expect(target).toHaveAttribute('aria-haspopup', 'dialog');
			action.update({ ...interactiveOptions, contentActions: null });
			expect(target).not.toHaveAttribute('aria-haspopup');
		});
	});

	describe('useTooltip role', () => {
		test('Sets role="dialog" on tooltip when contentActions is defined', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(target.querySelector('[role="dialog"]')).toBeInTheDocument();
			expect(target.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
		});

		test('Sets role="tooltip" on tooltip when no contentActions', async () => {
			action = createAction(target, { content: 'Hello' });
			await _enter(target);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();
			expect(target.querySelector('[role="dialog"]')).not.toBeInTheDocument();
		});

		test('Updates role from "dialog" to "tooltip" when contentActions is removed via update', async () => {
			action = createAction(target, options);
			action.update({ ...options, contentActions: null });
			await _enter(target);
			expect(target.querySelector('[role="tooltip"]')).toBeInTheDocument();
			expect(target.querySelector('[role="dialog"]')).not.toBeInTheDocument();
		});

		test('Updates role from "tooltip" to "dialog" when contentActions is added via update', async () => {
			action = createAction(target, { content: 'Hello' });
			action.update({
				content: 'Hello',
				contentActions: { '*': { eventType: 'click', callback: vi.fn(), callbackParams: [] } }
			});
			await _enter(target);
			expect(target.querySelector('[role="dialog"]')).toBeInTheDocument();
			expect(target.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
		});

		test('Sets aria-label="Tooltip" on interactive tooltip', async () => {
			action = createAction(target, options);
			await _enter(target);
			const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
			expect(dialog).toHaveAttribute('aria-label', 'Tooltip');
		});

		test('Removes aria-label when contentActions is removed via update', async () => {
			action = createAction(target, options);
			await _enter(target);
			action.update({ ...options, contentActions: null });
			await _enter(target);
			const tooltip = target.querySelector('[role="tooltip"]') as HTMLElement;
			expect(tooltip).not.toHaveAttribute('aria-label');
		});

		test('Uses custom ariaLabel on interactive tooltip', async () => {
			action = createAction(target, { ...options, ariaLabel: 'User actions menu' });
			await _enter(target);
			const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
			expect(dialog).toHaveAttribute('aria-label', 'User actions menu');
		});

		test('Updates aria-label via update()', async () => {
			action = createAction(target, options);
			await _enter(target);
			action.update({ ...options, ariaLabel: 'Updated label' });
			const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
			expect(dialog).toHaveAttribute('aria-label', 'Updated label');
		});

		test('Defaults aria-label to "Tooltip" when ariaLabel is not provided', async () => {
			action = createAction(target, options);
			await _enter(target);
			const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
			expect(dialog).toHaveAttribute('aria-label', 'Tooltip');
		});
	});

	describe('useTooltip tabindex', () => {
		const FOCUSABLE_TEMPLATE_ID = 'focusable-template';

		// Options pointing to a template that contains a focusable button.
		const focusableOptions: TooltipOptions = {
			contentSelector: `#${FOCUSABLE_TEMPLATE_ID}`,
			contentActions: {
				button: { eventType: 'click', callback: vi.fn(), callbackParams: [] }
			}
		};

		// Options pointing to the default template that has no focusable elements.
		const nonFocusableInteractiveOptions: TooltipOptions = {
			contentSelector: '#template',
			contentActions: {
				'*': { eventType: 'click', callback: vi.fn(), callbackParams: [] }
			}
		};

		beforeEach(() => {
			const tmpl = createElement({
				tag: 'template',
				attributes: { id: FOCUSABLE_TEMPLATE_ID },
				parent: document.body
			});
			createElement({
				tag: 'button',
				parent: (tmpl as HTMLTemplateElement).content as unknown as HTMLElement
			});
		});

		afterEach(() => {
			removeElement(`#${FOCUSABLE_TEMPLATE_ID}`);
		});

		test('Adds tabindex="0" on init when tooltip has focusable elements and target has no tabindex', () => {
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
		});

		test('Does not set tabindex when contentActions is set but tooltip has no focusable elements', () => {
			action = createAction(target, nonFocusableInteractiveOptions);
			expect(target).not.toHaveAttribute('tabindex');
		});

		test('Does not overwrite existing tabindex when tooltip has focusable elements', () => {
			target.setAttribute('tabindex', '-1');
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '-1');
			target.removeAttribute('tabindex');
		});

		test('Removes added tabindex on destroy', async () => {
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
			await action.destroy();
			expect(target).not.toHaveAttribute('tabindex');
			action = null;
		});

		test('Does not set tabindex when tooltip has no contentActions', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('tabindex');
		});

		test('Adds tabindex when contentActions is added via update and tooltip has focusable elements', () => {
			action = createAction(target, { content: 'Hello' });
			expect(target).not.toHaveAttribute('tabindex');
			action.update(focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
		});

		test('Adds tabindex when switching to a template with focusable elements while contentActions stays set', () => {
			action = createAction(target, nonFocusableInteractiveOptions);
			expect(target).not.toHaveAttribute('tabindex');
			action.update(focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
		});

		test('Removes tabindex when switching to a template without focusable elements while contentActions stays set', () => {
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
			action.update(nonFocusableInteractiveOptions);
			expect(target).not.toHaveAttribute('tabindex');
		});

		test('Removes added tabindex when contentActions is removed via update', () => {
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '0');
			action.update({ ...focusableOptions, contentActions: null });
			expect(target).not.toHaveAttribute('tabindex');
		});

		test('Does not remove pre-existing tabindex when contentActions is removed via update', () => {
			target.setAttribute('tabindex', '-1');
			action = createAction(target, focusableOptions);
			expect(target).toHaveAttribute('tabindex', '-1');
			action.update({ ...focusableOptions, contentActions: null });
			expect(target).toHaveAttribute('tabindex', '-1');
			target.removeAttribute('tabindex');
		});

		test('Does not apply tabindex when contentSelector matches no element', () => {
			action = createAction(target, {
				contentSelector: '#does-not-exist',
				contentActions: { '*': { eventType: 'click', callback: vi.fn(), callbackParams: [] } }
			});
			expect(target).not.toHaveAttribute('tabindex');
		});
	});

	describe('useTooltip dev warnings', () => {
		let warnSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		});

		afterEach(() => {
			warnSpy.mockRestore();
		});

		test('Warns when neither content nor contentSelector is provided', () => {
			action = createAction(target, {});
			expect(warnSpy).toHaveBeenCalledWith(
				'[useTooltip] No content provided. Set either `content` or `contentSelector`.'
			);
		});

		test('Does not warn when content is provided', () => {
			action = createAction(target, { content: 'Hello' });
			expect(warnSpy).not.toHaveBeenCalled();
		});

		test('Does not warn when contentSelector resolves to an existing element', () => {
			action = createAction(target, { contentSelector: '#template' });
			expect(warnSpy).not.toHaveBeenCalled();
		});

		test('Warns when contentSelector resolves to no element', () => {
			action = createAction(target, { contentSelector: '#does-not-exist' });
			expect(warnSpy).toHaveBeenCalledWith(
				'[useTooltip] contentSelector "#does-not-exist" matched no element in the DOM.'
			);
		});

		test('Re-warns on update when content is removed', () => {
			action = createAction(target, { content: 'Hello' });
			expect(warnSpy).not.toHaveBeenCalled();
			action.update({ content: null, contentSelector: null });
			expect(warnSpy).toHaveBeenCalledWith(
				'[useTooltip] No content provided. Set either `content` or `contentSelector`.'
			);
		});

		test('Re-warns on update when contentSelector becomes unresolvable', () => {
			action = createAction(target, { contentSelector: '#template' });
			expect(warnSpy).not.toHaveBeenCalled();
			action.update({ contentSelector: '#gone' });
			expect(warnSpy).toHaveBeenCalledWith(
				'[useTooltip] contentSelector "#gone" matched no element in the DOM.'
			);
		});

		test('Warns when contentSelector is unresolvable even if content is also provided', () => {
			// contentSelector takes precedence over content — if the selector resolves to nothing
			// the tooltip will be empty regardless of content, so the warning is correct.
			action = createAction(target, { content: 'Hello', contentSelector: '#does-not-exist' });
			expect(warnSpy).toHaveBeenCalledWith(
				'[useTooltip] contentSelector "#does-not-exist" matched no element in the DOM.'
			);
		});
	});

	describe('useTooltip focusout guard', () => {
		test('Does not close tooltip when focusout fires with relatedTarget inside the tooltip', async () => {
			action = createAction(target, options);
			await _enter(target);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			const contentEl = getElement('#content') as HTMLElement;
			await fireEvent.focusOut(target, { relatedTarget: contentEl });
			await standby(1);
			expect(tooltip).toBeInTheDocument();
		});

		test('Closes tooltip when focusout fires with relatedTarget outside the tooltip', async () => {
			action = createAction(target, options);
			await _enter(target);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			await fireEvent.focusOut(target, { relatedTarget: document.body });
			await standby(1);
			expect(tooltip).not.toBeInTheDocument();
		});

		test('Closes tooltip when focusout fires with no relatedTarget', async () => {
			action = createAction(target, options);
			await _enter(target);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			await fireEvent.focusOut(target, { relatedTarget: null });
			await standby(1);
			expect(tooltip).not.toBeInTheDocument();
		});
	});

	describe('useTooltip focus trap', () => {
		const TRAP_TEMPLATE_ID = 'trap-template';
		const trapOptions: TooltipOptions = {
			contentSelector: `#${TRAP_TEMPLATE_ID}`,
			contentActions: {
				'*': { eventType: 'click', callback: vi.fn(), callbackParams: [] }
			}
		};

		let trapTarget: HTMLElement;
		let trapAction: FullAction | null = null;

		beforeEach(() => {
			trapTarget = createElement({
				tag: 'div',
				attributes: { id: 'trap-target', tabindex: '0' },
				parent: document.body
			});
			const tmpl = createElement({
				tag: 'template',
				attributes: { id: TRAP_TEMPLATE_ID },
				parent: document.body
			});
			const content = (tmpl as HTMLTemplateElement).content as unknown as HTMLElement;
			const container = createElement({ tag: 'div', parent: content });
			createElement({ tag: 'button', parent: container });
			createElement({ tag: 'button', parent: container });
		});

		afterEach(async () => {
			await trapAction?.destroy();
			trapAction = null;
			removeElement('#trap-target');
			removeElement(`#${TRAP_TEMPLATE_ID}`);
		});

		test('Does not move focus to first focusable element when tooltip opens via keyboard', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _focus(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(document.activeElement).not.toBe(tooltip.querySelector('button'));
		});

		test('Does not move focus to first focusable element when tooltip opens via mouse', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(document.activeElement).not.toBe(tooltip.querySelector('button'));
		});

		test('Traps Tab: wraps focus from last element to first', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			const buttons = tooltip.querySelectorAll<HTMLElement>('button');
			buttons[buttons.length - 1].focus();
			await fireEvent.keyDown(tooltip, { key: 'Tab', shiftKey: false });
			await standby(1);
			expect(document.activeElement).toBe(buttons[0]);
		});

		test('Traps Shift+Tab: wraps focus from first element to last', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			const buttons = tooltip.querySelectorAll<HTMLElement>('button');
			buttons[0].focus();
			await fireEvent.keyDown(tooltip, { key: 'Tab', shiftKey: true });
			await standby(1);
			expect(document.activeElement).toBe(buttons[buttons.length - 1]);
		});

		test('Escape closes tooltip and returns focus to trigger', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			await _keyDown(trapTarget);
			expect(getElement('[role="dialog"]')).not.toBeInTheDocument();
			expect(document.activeElement).toBe(trapTarget);
		});

		test('Returns focus to trigger when tooltip closes', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			await _leave(trapTarget);
			expect(document.activeElement).toBe(trapTarget);
		});

		test('Does not trap focus when tooltip has no focusable elements', async () => {
			trapAction = createAction(trapTarget, {
				content: 'Hello',
				contentActions: { '*': { eventType: 'click', callback: vi.fn(), callbackParams: [] } }
			});
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(tooltip.querySelector('button')).toBeNull();
			expect(document.activeElement).not.toBeInstanceOf(HTMLButtonElement);
		});

		test('Sets aria-modal="true" when focus trap is active', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(tooltip).toHaveAttribute('aria-modal', 'true');
		});

		test('Does not set aria-modal when tooltip has no focusable elements', async () => {
			trapAction = createAction(trapTarget, {
				content: 'Hello',
				contentActions: { '*': { eventType: 'click', callback: vi.fn(), callbackParams: [] } }
			});
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(tooltip).not.toHaveAttribute('aria-modal');
		});

		test('Removes aria-modal when tooltip is hidden', async () => {
			trapAction = createAction(trapTarget, trapOptions);
			await _enter(trapTarget);
			const tooltip = getElement('[role="dialog"]') as HTMLElement;
			expect(tooltip).toHaveAttribute('aria-modal', 'true');
			await _leave(trapTarget);
			expect(tooltip).not.toBeInTheDocument();
		});
	});

	describe('useTooltip props: showOn / hideOn', () => {
		test('Shows tooltip on a custom showOn event', async () => {
			action = createAction(target, { ...options, showOn: ['click'] });
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Does not show tooltip on default mouseenter when showOn is overridden', async () => {
			action = createAction(target, { ...options, showOn: ['click'] });
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Hides tooltip on a custom hideOn event', async () => {
			action = createAction(target, { ...options, hideOn: ['dblclick'] });
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			await fireEvent.dblClick(target);
			await standby(1);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Does not hide tooltip on default mouseleave when hideOn is overridden', async () => {
			action = createAction(target, { ...options, hideOn: ['dblclick'] });
			await _enter(target);
			await _leave(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Keeps tooltip visible with hideOn: []', async () => {
			action = createAction(target, { ...options, hideOn: [] });
			await _enter(target);
			await _leave(target);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Closes tooltip with hideOn: [] via Escape key', async () => {
			action = createAction(target, { ...options, hideOn: [] });
			await _enter(target);
			await _keyDown(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Default behaviour unchanged when showOn/hideOn are not provided', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _leave(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Updates showOn reactively via action.update()', async () => {
			action = createAction(target, options);
			// First confirm default mouseenter shows tooltip
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			await _leave(target);

			// Switch to click-only
			action.update({ ...options, showOn: ['click'] });
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Updates hideOn reactively via action.update()', async () => {
			action = createAction(target, options);
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();

			// Switch to dblclick-only dismiss
			action.update({ ...options, hideOn: ['dblclick'] });
			await _leave(target);
			expect(getElement('#content')).toBeInTheDocument();
			await fireEvent.dblClick(target);
			await standby(1);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Toggles tooltip when the same event is in both showOn and hideOn', async () => {
			action = createAction(target, { ...options, showOn: ['click'], hideOn: ['click'] });
			// First click: show
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
			// Second click: hide
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).not.toBeInTheDocument();
			// Third click: show again
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Toggle respects open lock — does not hide when open: true', async () => {
			action = createAction(target, {
				...options,
				showOn: ['click'],
				hideOn: ['click'],
				open: true
			});
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
			// Click should NOT hide while open is locked
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Toggle events and exclusive events can coexist', async () => {
			// click toggles, mouseenter shows only (no mouseleave in hideOn)
			action = createAction(target, {
				...options,
				showOn: ['click', 'mouseenter'],
				hideOn: ['click']
			});
			// mouseenter shows
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			// click hides (toggle → visible → hide)
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).not.toBeInTheDocument();
			// click shows (toggle → hidden → show)
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Applies new showOn when disabled and showOn change simultaneously', async () => {
			// Start enabled with default mouseenter trigger
			action = createAction(target, options);
			// Disable and switch to click trigger at the same time
			action.update({ ...options, disabled: true, showOn: ['click'] });
			// Re-enable without changing showOn — new value must have been stored
			action.update({ ...options, disabled: false });
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Applies new showOn when re-enabling and showOn change simultaneously', async () => {
			// Start disabled
			action = createAction(target, { ...options, disabled: true });
			// Re-enable and switch to click trigger at the same time
			action.update({ ...options, disabled: false, showOn: ['click'] });
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
			await fireEvent.click(target);
			await standby(1);
			expect(getElement('#content')).toBeInTheDocument();
		});

		test('Applies new hideOn when re-enabling and hideOn change simultaneously', async () => {
			// Start disabled
			action = createAction(target, { ...options, disabled: true });
			// Re-enable and switch to dblclick dismiss at the same time
			action.update({ ...options, disabled: false, hideOn: ['dblclick'] });
			await _enter(target);
			expect(getElement('#content')).toBeInTheDocument();
			// Default mouseleave must no longer dismiss
			await _leave(target);
			expect(getElement('#content')).toBeInTheDocument();
			// New hideOn event must dismiss
			await fireEvent.dblClick(target);
			await standby(1);
			expect(getElement('#content')).not.toBeInTheDocument();
		});
	});
});
