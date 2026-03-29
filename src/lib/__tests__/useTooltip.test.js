import { afterEach, beforeEach, expect, describe, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { createElement } from '@untemps/utils/dom/createElement';
import { getElement } from '@untemps/utils/dom/getElement';
import { removeElement } from '@untemps/utils/dom/removeElement';
import { standby } from '@untemps/utils/async/standby';

import useTooltip from '../useTooltip';
import Tooltip from '../Tooltip';

const initTarget = (id) => {
	return createElement({ tag: 'div', attributes: { id, class: 'bar' }, parent: document.body });
};

const initTemplate = (id, contentId) => {
	const template = createElement({ tag: 'template', attributes: { id }, parent: document.body });
	createElement({
		tag: 'div',
		attributes: { id: contentId, class: 'foo' },
		parent: template.content
	});
	return template;
};

describe('useTooltip', () => {
	let target,
		template,
		options,
		action = null;

	beforeEach(() => {
		target = initTarget('target');
		template = initTemplate('template', 'content');
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
		action.destroy();
		action = null;

		removeElement('#target');
		removeElement('#template');

		target = null;
		template = null;
		options = null;

		Tooltip.destroy();
	});

	describe('useTooltip interactions', () => {
		describe('init', () => {
			test('Shows tooltip on mouse enter', async () => {
				action = useTooltip(target, options);
				await _enter(target);
				expect(target).toHaveStyle('position: relative');
				expect(target).toHaveAttribute('aria-describedby');
				expect(getElement('#content')).toBeInTheDocument();
			});

			test('Hides tooltip on mouse leave', async () => {
				action = useTooltip(target, options);
				await _enterAndLeave(target);
				expect(getElement('#content')).not.toBeInTheDocument();
			});

			test('Hides tooltip on escape key down', async () => {
				action = useTooltip(target, options);
				await _enter(target);
				await _keyDown(target);
				expect(getElement('#content')).not.toBeInTheDocument();
			});
		});
	});

	describe('useTooltip lifecycle', () => {
		test('Destroys tooltip', async () => {
			action = useTooltip(target, options);
			action.destroy(target);
			expect(target).not.toHaveStyle('position: relative');
			expect(target).not.toHaveAttribute('aria-describedby');
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});
	});

	describe('useTooltip props: content', () => {
		test('Displays text content', async () => {
			const content = 'Foo';
			action = useTooltip(target, {
				...options,
				contentSelector: null,
				content
			});
			await _enter(target);
			expect(target).toHaveTextContent(content);
		});

		test('Displays content element over text', async () => {
			const content = 'Foo';
			action = useTooltip(target, {
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
			action = useTooltip(target, options);
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).toBeInTheDocument();
		});

		test('Closes tooltip after triggering callback', async () => {
			action = useTooltip(target, options);
			options.contentActions['*'].closeOnCallback = true;
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).not.toBeInTheDocument();
			await fireEvent.animationEnd(content.parentNode);
			expect(content).not.toBeInTheDocument();
		});

		test('Closes tooltip after triggering callback when animated', async () => {
			action = useTooltip(target, { ...options, animated: true });
			options.contentActions['*'].closeOnCallback = true;
			const contentAction = options.contentActions['*'];
			await _enter(target);
			const content = getElement('#content');
			await fireEvent.click(content);
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				expect.any(Event)
			);
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(content.parentNode);
			expect(content).not.toBeInTheDocument();
		});

		test('Triggers new callback on tooltip click after update', async () => {
			action = useTooltip(target, options);
			const newCallback = vi.fn(() => 0);
			const newOptions = {
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
			await fireEvent.click(getElement('#content'));
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				contentAction.callbackParams[1],
				expect.any(Event)
			);
		});
	});

	describe('useTooltip props: containerClassName', () => {
		test('Sets tooltip default class', async () => {
			action = useTooltip(target, options);
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip');
		});

		test('Updates tooltip class', async () => {
			action = useTooltip(target, options);
			action.update({
				containerClassName: '__custom-tooltip'
			});
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__custom-tooltip');
		});

		test('Sets tooltip custom class', async () => {
			action = useTooltip(target, { ...options, containerClassName: '__custom-tooltip' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__custom-tooltip');
		});
	});

	describe('useTooltip props: disabled', () => {
		test('Disables tooltip', async () => {
			action = useTooltip(target, {
				...options,
				disabled: true
			});
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Disables tooltip after update', async () => {
			action = useTooltip(target, options);
			action.update({
				disabled: true
			});
			await _enter(target);
			expect(getElement('#content')).not.toBeInTheDocument();
		});

		test('Enables tooltip after update', async () => {
			action = useTooltip(target, {
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
				height: 50
			});
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
			action = useTooltip(target, {
				...options,
				position: 'left'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).toHaveClass('__tooltip-left');
		});

		test('Positions tooltip on the left after update', async () => {
			action = useTooltip(target, options);
			action.update({
				position: 'left'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).not.toHaveClass('__tooltip-top');
			expect(content.parentNode).toHaveClass('__tooltip-left');
		});

		test('Positions tooltip on the right', async () => {
			action = useTooltip(target, {
				...options,
				position: 'right'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).toHaveLength(0);
			expect(content.parentNode.style.right).not.toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).toHaveClass('__tooltip-right');
		});

		test('Positions tooltip on the right after update', async () => {
			action = useTooltip(target, options);
			action.update({
				position: 'right'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).toHaveLength(0);
			expect(content.parentNode.style.right).not.toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).not.toHaveClass('__tooltip-top');
			expect(content.parentNode).toHaveClass('__tooltip-right');
		});

		test('Positions tooltip at the top', async () => {
			action = useTooltip(target, options);
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).toHaveClass('__tooltip-top');
		});

		test('Positions tooltip at the top after update', async () => {
			action = useTooltip(target, {
				...options,
				position: 'left'
			});
			action.update({
				position: 'top'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).not.toHaveLength(0);
			expect(content.parentNode.style.bottom).toHaveLength(0);
			expect(content.parentNode).not.toHaveClass('__tooltip-left');
			expect(content.parentNode).toHaveClass('__tooltip-top');
		});

		test('Positions tooltip at the bottom', async () => {
			action = useTooltip(target, {
				...options,
				position: 'bottom'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).toHaveLength(0);
			expect(content.parentNode.style.bottom).not.toHaveLength(0);
			expect(content.parentNode).toHaveClass('__tooltip-bottom');
		});

		test('Positions tooltip at the bottom after update', async () => {
			action = useTooltip(target, options);
			action.update({
				position: 'bottom'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.left).not.toHaveLength(0);
			expect(content.parentNode.style.right).toHaveLength(0);
			expect(content.parentNode.style.top).toHaveLength(0);
			expect(content.parentNode.style.bottom).not.toHaveLength(0);
			expect(content.parentNode).not.toHaveClass('__tooltip-top');
			expect(content.parentNode).toHaveClass('__tooltip-bottom');
		});
	});

	describe('useTooltip props: position (boundary placement)', () => {
		const VW = 1024;
		const VH = 768;

		const mockRects = (targetRect, tooltipRect) => {
			Object.defineProperty(document.documentElement, 'clientWidth', {
				get: () => VW,
				configurable: true
			});
			Object.defineProperty(document.documentElement, 'clientHeight', {
				get: () => VH,
				configurable: true
			});
			vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
				if (this === target) return { ...targetRect };
				return { ...tooltipRect };
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
			action = useTooltip(target, { ...options, position: 'top' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-top');
		});

		test('Uses declared bottom when there is sufficient space below', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'bottom' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-bottom');
		});

		test('Uses declared left when there is sufficient space to the left', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 200, right: 300, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-left');
		});

		test('Uses declared right when there is sufficient space to the right', async () => {
			mockRects(
				{ top: 100, bottom: 120, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'right' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-right');
		});

		// — Overflow: best available position selected (most space) —

		test('Switches to the position with most available space when declared top overflows', async () => {
			// target near top, tooltip taller than available space above
			// space: top=-5, bottom=533, left=90, right=814 → picks right (most space, fits)
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'top' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-right');
			expect(getElement('#content').parentNode).not.toHaveClass('__tooltip-top');
		});

		test('Switches to bottom (not just opposite) when it has the most space', async () => {
			// target near top-left corner; tooltip wide enough that left/right don't fit
			// space: top=-5, bottom=533, left=90, right=814
			// tooltip width=900 → left(90<900) and right(814<900) don't fit; bottom fits (533>=30)
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 900, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'top' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-bottom');
			expect(getElement('#content').parentNode).not.toHaveClass('__tooltip-top');
		});

		test('Switches left to right when right has more space and fits', async () => {
			// target near left edge, explicit width so no width adaptation
			// space: left=-5, right=909 → picks right
			mockRects(
				{ top: 100, bottom: 120, left: 5, right: 105, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left', width: '80px' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-right');
			expect(getElement('#content').parentNode).not.toHaveClass('__tooltip-left');
		});

		test('Switches right to left when left has more space and fits', async () => {
			// target near right edge, explicit width so no width adaptation
			// space: right=-5, left=909 → picks left
			mockRects(
				{ top: 100, bottom: 120, left: VW - 105, right: VW - 5, width: 100, height: 20 },
				{ width: 80, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'right', width: '80px' });
			await _enter(target);
			expect(getElement('#content').parentNode).toHaveClass('__tooltip-left');
			expect(getElement('#content').parentNode).not.toHaveClass('__tooltip-right');
		});

		// — Width adaptation (width: auto) —

		test('Adapts width to available space and keeps declared left when space >= MIN_WIDTH', async () => {
			// target at left=150; space.left=140 >= MIN_WIDTH(80); tooltip natural width=200 > 140
			// → stays left, width adapted to 140px
			mockRects(
				{ top: 100, bottom: 120, left: 150, right: 250, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left' });
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).toHaveClass('__tooltip-left');
			expect(tooltip.style.width).toBe('140px');
		});

		test('Adapts width to available space and keeps declared right when space >= MIN_WIDTH', async () => {
			// target at right=900; space.right=1024-900-10=114 >= MIN_WIDTH(80); tooltip width=200 > 114
			// → stays right, width adapted to 114px
			mockRects(
				{ top: 100, bottom: 120, left: 800, right: 900, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'right' });
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).toHaveClass('__tooltip-right');
			expect(tooltip.style.width).toBe('114px');
		});

		test('Switches position when available space is below MIN_WIDTH and width is auto', async () => {
			// space.left=40 < MIN_WIDTH(80); cannot adapt; best alternative: right(909>=80) → right
			mockRects(
				{ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left' });
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).toHaveClass('__tooltip-right');
			expect(tooltip).not.toHaveClass('__tooltip-left');
		});

		test('Does not adapt width when width prop is explicitly set', async () => {
			// explicit width='200px'; space.left=40 too small; no width adaptation → switches position
			mockRects(
				{ top: 100, bottom: 120, left: 50, right: 150, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left', width: '200px' });
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).not.toHaveClass('__tooltip-left');
		});

		// — Class and state management —

		test('Does not mutate class when containerClassName is set', async () => {
			mockRects(
				{ top: 5, bottom: 25, left: 100, right: 200, width: 100, height: 20 },
				{ width: 900, height: 30 }
			);
			action = useTooltip(target, {
				...options,
				position: 'top',
				containerClassName: 'my-tooltip'
			});
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).toHaveClass('my-tooltip');
			expect(tooltip).not.toHaveClass('__tooltip-bottom');
		});

		test('Resets class and width after tooltip is hidden', async () => {
			// First show: top overflows → switches + width adapted
			mockRects(
				{ top: 100, bottom: 120, left: 150, right: 250, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			action = useTooltip(target, { ...options, position: 'left' });
			await _enter(target);
			expect(getElement('#content').parentNode.style.width).toBe('140px');
			await _leave(target);

			// Second show: enough space → declared position, no adapted width
			vi.restoreAllMocks();
			mockRects(
				{ top: 100, bottom: 120, left: 300, right: 400, width: 100, height: 20 },
				{ width: 200, height: 30 }
			);
			await _enter(target);
			const tooltip = getElement('#content').parentNode;
			expect(tooltip).toHaveClass('__tooltip-left');
			expect(tooltip.style.width).toBe('');
		});
	});

	describe('useTooltip props: enterDelay', () => {
		test('Delays tooltip appearance', async () => {
			action = useTooltip(target, {
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
			action = useTooltip(target, options);
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
			action = useTooltip(target, {
				...options,
				onEnter
			});
			await _enter(target);
			await standby(0);
			expect(onEnter).toHaveBeenCalled();
		});

		test('Triggers callback when entering tooltip after update', async () => {
			const onEnter = vi.fn(() => 0);
			action = useTooltip(target, options);
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
			action = useTooltip(target, {
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
			action = useTooltip(target, options);
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
			action = useTooltip(target, {
				...options,
				width: '200px'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toBe('200px');
		});

		test('Does not set width when value is auto', async () => {
			action = useTooltip(target, {
				...options,
				width: 'auto'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toHaveLength(0);
		});

		test('Does not set width when value is not provided', async () => {
			action = useTooltip(target, options);
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toHaveLength(0);
		});

		test('Sets tooltip width after update', async () => {
			action = useTooltip(target, options);
			action.update({
				width: '300px'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toBe('300px');
		});

		test('Removes tooltip width after update to auto', async () => {
			action = useTooltip(target, {
				...options,
				width: '200px'
			});
			action.update({
				width: 'auto'
			});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toHaveLength(0);
		});

		test('Does not change width when not passed in update', async () => {
			action = useTooltip(target, {
				...options,
				width: '200px'
			});
			action.update({});
			await _enter(target);
			const content = getElement('#content');
			expect(content.parentNode.style.width).toBe('200px');
		});
	});

	describe('useTooltip props: animated', () => {
		test('Animates tooltip disappearance', async () => {
			action = useTooltip(target, {
				...options,
				animated: true
			});
			await _enterAndLeave(target);
			const content = getElement('#content');
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(content.parentNode);
			expect(content).not.toBeInTheDocument();
		});

		test('Animates tooltip disappearance after update', async () => {
			action = useTooltip(target, options);
			action.update({
				animated: true
			});
			await _enterAndLeave(target);
			const content = getElement('#content');
			expect(content).toBeInTheDocument();
			await fireEvent.animationEnd(content.parentNode);
			expect(content).not.toBeInTheDocument();
		});
	});
});
