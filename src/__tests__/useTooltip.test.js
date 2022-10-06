/**
 * @jest-environment jsdom
 */

import { fireEvent } from '@testing-library/svelte'
import { createElement } from '@untemps/utils/dom/createElement'
import { getElement } from '@untemps/utils/dom/getElement'
import { removeElement } from '@untemps/utils/dom/removeElement'
import { standby } from '@untemps/utils/async/standby'

import useTooltip from '../useTooltip'
import Tooltip from '../Tooltip'

const initTarget = (id) => {
	return createElement({ tag: 'div', attributes: { id, class: 'bar' }, parent: document.body })
}

const initTemplate = (id) => {
	const template = createElement({ tag: 'template', attributes: { id }, parent: document.body })
	const content = createElement({ tag: 'div', attributes: { id: 'content', class: 'foo' }, parent: template.content })
	return template
}

describe('useTooltip', () => {
	let target,
		template,
		options,
		action = null

	beforeEach(() => {
		target = initTarget('target')
		template = initTemplate('template')
		options = {
			contentSelector: '#template',
			contentActions: {
				'*': {
					eventType: 'click',
					callback: jest.fn(),
					callbackParams: ['foo'],
				},
			},
		}
	})

	afterEach(() => {
		action.destroy()
		action = null

		removeElement('#target')
		removeElement('#template')

		target = null
		template = null
		options = null

		Tooltip.destroy()
	})

	describe('useTooltip interactions', () => {
		describe('init', () => {
			it('Shows tooltip on mouse enter', async () => {
				action = useTooltip(target, options)
				await _enter(target)
				expect(target).toHaveStyle('position: relative')
				expect(target).toHaveAttribute('aria-describedby')
				expect(getElement('#content')).toBeInTheDocument()
			})

			it('Hides tooltip on mouse leave', async () => {
				action = useTooltip(target, options)
				await _enterAndLeave(target)
				expect(getElement('#content')).not.toBeInTheDocument()
			})

			it('Hides tooltip on escape key down', async () => {
				action = useTooltip(target, options)
				await _enter(target)
				await _keyDown(target)
				expect(getElement('#content')).not.toBeInTheDocument()
			})
		})

		describe('update', () => {
			afterEach(() => {
				removeElement('#new-template')
			})

			it('Shows tooltip on mouse enter', async () => {
				action = useTooltip(target, options)
				const newTemplate = createElement({
					tag: 'div',
					attributes: { id: 'new-template' },
					parent: document.body,
				})
				action.update({
					contentSelector: '#new-template',
				})
				await _enter(target)
				expect(newTemplate).toBeInTheDocument()
			})
		})

		describe('focus', () => {
			it('Shows tooltip on focus in', async () => {
				action = useTooltip(target, options)
				await _focus(target)
				expect(getElement('#content')).toBeInTheDocument()
			})

			it('Hides tooltip on focus out', async () => {
				action = useTooltip(target, options)
				await _focusAndBlur(target)
				expect(getElement('#content')).not.toBeInTheDocument()
			})

			it('Hides tooltip on escape key down', async () => {
				action = useTooltip(target, options)
				await _focus(target)
				await _keyDown(target)
				expect(getElement('#content')).not.toBeInTheDocument()
			})
		})
	})

	describe('useTooltip lifecycle', () => {
		it('Destroys tooltip', async () => {
			action = useTooltip(target, options)
			action.destroy(target)
			expect(target).not.toHaveStyle('position: relative')
			expect(target).not.toHaveAttribute('aria-describedby')
			await _enter(target)
			expect(getElement('#content')).not.toBeInTheDocument()
		})
	})

	describe('useTooltip props: content', () => {
		it('Displays text content', async () => {
			const content = 'Foo'
			action = useTooltip(target, {
				...options,
				contentSelector: null,
				content,
			})
			await _enter(target)
			expect(target).toHaveTextContent(content)
		})

		it('Displays content element over text', async () => {
			const content = 'Foo'
			action = useTooltip(target, {
				...options,
				content,
			})
			await _enter(target)
			expect(target).not.toHaveTextContent(content)
			expect(getElement('#content')).toBeInTheDocument()
		})
	})

	describe('useTooltip props: contentActions', () => {
		it('Triggers callback on tooltip click', async () => {
			action = useTooltip(target, options)
			const contentAction = options.contentActions['*']
			await _enter(target)
			const content = getElement('#content')
			await fireEvent.click(content)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(content).toBeInTheDocument()
		})

		it('Closes tooltip after triggering callback', async () => {
			action = useTooltip(target, options)
			options.contentActions['*'].closeOnCallback = true
			const contentAction = options.contentActions['*']
			await _enter(target)
			const content = getElement('#content')
			await fireEvent.click(content)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(content).not.toBeInTheDocument()
			await fireEvent.animationEnd(content.parentNode)
			expect(content).not.toBeInTheDocument()
		})

		it('Closes tooltip after triggering callback when animated', async () => {
			action = useTooltip(target, { ...options, animated: true })
			options.contentActions['*'].closeOnCallback = true
			const contentAction = options.contentActions['*']
			await _enter(target)
			const content = getElement('#content')
			await fireEvent.click(content)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(content).toBeInTheDocument()
			await fireEvent.animationEnd(content.parentNode)
			expect(content).not.toBeInTheDocument()
		})

		it('Triggers new callback on tooltip click after update', async () => {
			action = useTooltip(target, options)
			const newCallback = jest.fn()
			const newOptions = {
				...options,
				contentActions: {
					'*': {
						eventType: 'click',
						callback: newCallback,
						callbackParams: ['foo', 'bar'],
					},
				},
			}
			const contentAction = newOptions.contentActions['*']
			action.update(newOptions)
			await _enter(target)
			await fireEvent.click(getElement('#content'))
			expect(contentAction.callback).toHaveBeenCalledWith(
				contentAction.callbackParams[0],
				contentAction.callbackParams[1],
				expect.any(Event)
			)
		})
	})

	describe('useTooltip props: containerClassName', () => {
		it('Sets tooltip default class', async () => {
			action = useTooltip(target, options)
			await _enter(target)
			expect(getElement('#content').parentNode).toHaveClass('__tooltip')
		})

		it('Updates tooltip class', async () => {
			action = useTooltip(target, options)
			action.update({
				containerClassName: '__custom-tooltip',
			})
			await _enter(target)
			expect(getElement('#content').parentNode).toHaveClass('__custom-tooltip')
		})

		it('Sets tooltip custom class', async () => {
			action = useTooltip(target, { ...options, containerClassName: '__custom-tooltip' })
			await _enter(target)
			expect(getElement('#content').parentNode).toHaveClass('__custom-tooltip')
		})
	})

	describe('useTooltip props: disabled', () => {
		it('Disables tooltip', async () => {
			action = useTooltip(target, {
				...options,
				disabled: true,
			})
			await _enter(target)
			expect(getElement('#content')).not.toBeInTheDocument()
		})

		it('Disables tooltip after update', async () => {
			action = useTooltip(target, options)
			action.update({
				disabled: true,
			})
			await _enter(target)
			expect(getElement('#content')).not.toBeInTheDocument()
		})

		it('Enables tooltip after update', async () => {
			action = useTooltip(target, {
				...options,
				disabled: true,
			})
			action.update({
				disabled: false,
			})
			await _enter(target)
			expect(getElement('#content')).toBeInTheDocument()
		})
	})

	describe('useTooltip props: position', () => {
		it('Positions tooltip on the left', async () => {
			action = useTooltip(target, {
				...options,
				position: 'left',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).toHaveClass('__tooltip-left')
		})

		it('Positions tooltip on the left after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'left',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).not.toHaveClass('__tooltip-top')
			expect(content.parentNode).toHaveClass('__tooltip-left')
		})

		it('Positions tooltip on the right', async () => {
			action = useTooltip(target, {
				...options,
				position: 'right',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).toHaveLength(0)
			expect(content.parentNode.style.right).not.toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).toHaveClass('__tooltip-right')
		})

		it('Positions tooltip on the right after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'right',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).toHaveLength(0)
			expect(content.parentNode.style.right).not.toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).not.toHaveClass('__tooltip-top')
			expect(content.parentNode).toHaveClass('__tooltip-right')
		})

		it('Positions tooltip at the top', async () => {
			action = useTooltip(target, options)
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).toHaveClass('__tooltip-top')
		})

		it('Positions tooltip at the top after update', async () => {
			action = useTooltip(target, {
				...options,
				position: 'left',
			})
			action.update({
				position: 'top',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).not.toHaveLength(0)
			expect(content.parentNode.style.bottom).toHaveLength(0)
			expect(content.parentNode).not.toHaveClass('__tooltip-left')
			expect(content.parentNode).toHaveClass('__tooltip-top')
		})

		it('Positions tooltip at the bottom', async () => {
			action = useTooltip(target, {
				...options,
				position: 'bottom',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).toHaveLength(0)
			expect(content.parentNode.style.bottom).not.toHaveLength(0)
			expect(content.parentNode).toHaveClass('__tooltip-bottom')
		})

		it('Positions tooltip at the bottom after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'bottom',
			})
			await _enter(target)
			const content = getElement('#content')
			expect(content.parentNode.style.left).not.toHaveLength(0)
			expect(content.parentNode.style.right).toHaveLength(0)
			expect(content.parentNode.style.top).toHaveLength(0)
			expect(content.parentNode.style.bottom).not.toHaveLength(0)
			expect(content.parentNode).not.toHaveClass('__tooltip-top')
			expect(content.parentNode).toHaveClass('__tooltip-bottom')
		})
	})

	describe('useTooltip props: enterDelay', () => {
		it('Delays tooltip appearance', async () => {
			action = useTooltip(target, {
				...options,
				enterDelay: 50,
			})
			await _enter(target)
			let content = getElement('#content')
			expect(content).toBeNull()
			await standby(100)
			content = getElement('#content')
			expect(content).toBeInTheDocument()
		})

		it('Delays tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				enterDelay: 150,
			})
			await _enter(target)
			await standby(100)
			let content = getElement('#content')
			expect(content).toBeNull()
			await standby(100)
			content = getElement('#content')
			expect(content).toBeInTheDocument()
		})
	})

	describe('useTooltip props: leaveDelay', () => {
		it('Delays tooltip disappearance', async () => {
			action = useTooltip(target, {
				...options,
				leaveDelay: 50,
			})
			await _enterAndLeave(target)
			const content = getElement('#content')
			expect(content).toBeInTheDocument()
			await standby(100)
			expect(content).not.toBeInTheDocument()
		})

		it('Delays tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				leaveDelay: 150,
			})
			await _enterAndLeave(target)
			await standby(100)
			const content = getElement('#content')
			expect(content).toBeInTheDocument()
			await standby(100)
			expect(content).not.toBeInTheDocument()
		})
	})

	describe('useTooltip props: animated', () => {
		it('Animates tooltip disappearance', async () => {
			action = useTooltip(target, {
				...options,
				animated: true,
			})
			await _enterAndLeave(target)
			const content = getElement('#content')
			expect(content).toBeInTheDocument()
			await fireEvent.animationEnd(content.parentNode)
			expect(content).not.toBeInTheDocument()
		})

		it('Animates tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				animated: true,
			})
			await _enterAndLeave(target)
			const content = getElement('#content')
			expect(content).toBeInTheDocument()
			await fireEvent.animationEnd(content.parentNode)
			expect(content).not.toBeInTheDocument()
		})
	})
})
