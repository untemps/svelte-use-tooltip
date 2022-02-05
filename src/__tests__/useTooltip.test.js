/**
 * @jest-environment jsdom
 */

import { fireEvent } from '@testing-library/svelte'

import useTooltip from '../useTooltip'
import Tooltip from '../Tooltip'

describe('useTooltip', () => {
	let target,
		template,
		options,
		action = null

	const _enter = async () =>
		new Promise(async (resolve) => {
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			await _sleep(1)
			resolve()
		})

	const _leave = async () =>
		new Promise(async (resolve) => {
			await fireEvent.mouseLeave(target)
			await _sleep(1)
			resolve()
		})

	const _enterAndLeave = async () =>
		new Promise(async (resolve) => {
			await _enter()
			await _leave()
			resolve()
		})

	const _focus = async () =>
		new Promise(async (resolve) => {
			await fireEvent.focusIn(target)
			await _sleep(1)
			resolve()
		})

	const _blur = async () =>
		new Promise(async (resolve) => {
			await fireEvent.focusOut(target)
			await _sleep(1)
			resolve()
		})

	const _focusAndBlur = async () =>
		new Promise(async (resolve) => {
			await _focus()
			await _blur()
			resolve()
		})

	const _keyDown = async (key) =>
		new Promise(async (resolve) => {
			await fireEvent.keyDown(target, key || { key: 'Escape', code: 'Escape', keyCode: 27 })
			await _sleep(1)
			resolve()
		})

	const _scroll = async () =>
		new Promise(async (resolve) => {
			await fireEvent.scroll(window)
			await _sleep(1)
			resolve()
		})

	const _resize = async () =>
		new Promise(async (resolve) => {
			await fireEvent(window, new Event('resize'))
			await _sleep(1)
			resolve()
		})

	beforeEach(() => {
		target = _createElement('target', null, { class: 'bar' })
		template = _createElement('template')
		options = {
			contentSelector: '#template',
			contentActions: {
				'*': {
					eventType: 'click',
					callback: jest.fn(),
					callbackParams: ['foo'],
				},
			},
			disabled: false,
		}
	})

	afterEach(() => {
		action.destroy()
		action = null

		_removeElement('#target')
		_removeElement('#template')

		target = null
		template = null
		options = null

		Tooltip.destroy()
	})

	describe('useTooltip interactions', () => {
		describe('init', () => {
			it('Shows tooltip on mouse enter', async () => {
				action = useTooltip(target, options)
				await _enter()
				expect(template).toBeInTheDocument()
			})

			it('Hides tooltip on mouse leave', async () => {
				action = useTooltip(target, options)
				await _enterAndLeave()
				expect(template).not.toBeInTheDocument()
			})

			it('Hides tooltip on escape key down', async () => {
				action = useTooltip(target, options)
				await _enter()
				expect(template).toBeInTheDocument()
				await _keyDown()
				expect(template).not.toBeInTheDocument()
			})

			it('Hides tooltip on scroll', async () => {
				action = useTooltip(target, options)
				await _enter()
				expect(template).toBeInTheDocument()
				await _scroll()
				expect(template).not.toBeInTheDocument()
			})

			it('Hides tooltip on resize', async () => {
				action = useTooltip(target, options)
				await _enter()
				expect(template).toBeInTheDocument()
				await _resize()
				expect(template).not.toBeInTheDocument()
			})
		})

		describe('update', () => {
			afterEach(() => {
				_removeElement('#new-template')
			})

			it('Shows tooltip on mouse enter', async () => {
				action = useTooltip(target, options)
				const newTemplate = _createElement('new-template')
				action.update({
					contentSelector: '#new-template',
				})
				await _enter()
				expect(newTemplate).toBeInTheDocument()
			})
		})

		describe('focus', () => {
			it('Shows tooltip on focus in', async () => {
				action = useTooltip(target, options)
				await _focus()
				expect(template).toBeInTheDocument()
			})

			it('Hides tooltip on focus out', async () => {
				action = useTooltip(target, options)
				await _focusAndBlur()
				expect(template).not.toBeInTheDocument()
			})

			it('Hides tooltip on escape key down', async () => {
				action = useTooltip(target, options)
				await _focus()
				await _keyDown()
				expect(template).not.toBeInTheDocument()
			})
		})
	})

	describe('useTooltip lifecycle', () => {
		it('Destroys tooltip', async () => {
			action = useTooltip(target, options)
			action.destroy()
			await _enter()
			expect(template).not.toBeVisible()
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
			await _enter()
			expect(target).toHaveTextContent(content)
		})

		it('Displays content element over text', async () => {
			const content = 'Foo'
			action = useTooltip(target, {
				...options,
				content,
			})
			await _enter()
			expect(target).not.toHaveTextContent(content)
			expect(template).toBeInTheDocument()
		})
	})

	describe('useTooltip props: contentClone', () => {
		it('Does not clone content element', async () => {
			action = useTooltip(target, options)
			await _sleep(1)
			expect(template).not.toBeVisible()
		})

		it('Clones content element', async () => {
			action = useTooltip(target, {
				...options,
				contentClone: true,
			})
			await _sleep(1)
			expect(template).toBeVisible()
		})
	})

	describe('useTooltip props: contentActions', () => {
		it('Triggers callback on tooltip click', async () => {
			action = useTooltip(target, options)
			const contentAction = options.contentActions['*']
			await _enter()
			await fireEvent.click(template)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(template).toBeInTheDocument()
		})

		it('Triggers callback on element click within tooltip', async () => {
			const newTemplate = _createElement('new-template')
			const clickableElement = _createElement('clickable-element', newTemplate)
			const contentActions = {
				'#clickable-element': {
					eventType: 'click',
					callback: jest.fn(),
					callbackParams: ['foo'],
				},
			}
			action = useTooltip(target, {
				...options,
				contentSelector: '#new-template',
				contentActions,
			})
			const contentAction = contentActions['#clickable-element']
			await _enter()
			await fireEvent.click(clickableElement)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(newTemplate).toBeInTheDocument()
		})

		it('Closes tooltip after triggering callback', async () => {
			action = useTooltip(target, options)
			options.contentActions['*'].closeOnCallback = true
			const contentAction = options.contentActions['*']
			await _enter()
			await fireEvent.click(template)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(template).not.toBeInTheDocument()
			await fireEvent.animationEnd(template.parentNode)
			expect(template).not.toBeInTheDocument()
		})

		it('Closes tooltip after triggering callback when animated', async () => {
			action = useTooltip(target, { ...options, animated: true })
			options.contentActions['*'].closeOnCallback = true
			const contentAction = options.contentActions['*']
			await _enter()
			await fireEvent.click(template)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(template).toBeInTheDocument()
			await fireEvent.animationEnd(template.parentNode)
			expect(template).not.toBeInTheDocument()
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
			await _enter()
			await fireEvent.click(template)
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
			await _enter()
			expect(template.parentNode).toHaveClass('__tooltip')
		})

		it('Updates tooltip class', async () => {
			action = useTooltip(target, options)
			action.update({
				containerClassName: '__custom-tooltip',
			})
			await _enter()
			expect(template.parentNode).toHaveClass('__custom-tooltip')
		})

		it('Sets tooltip custom class', async () => {
			action = useTooltip(target, { ...options, containerClassName: '__custom-tooltip' })
			await _enter()
			expect(template.parentNode).toHaveClass('__custom-tooltip')
		})
	})

	describe('useTooltip props: disabled', () => {
		it('Disables tooltip', async () => {
			action = useTooltip(target, {
				...options,
				disabled: true,
			})
			await _enter()
			expect(template).not.toBeVisible()
		})

		it('Disables tooltip after update', async () => {
			action = useTooltip(target, options)
			action.update({
				disabled: true,
			})
			await _enter()
			expect(template).not.toBeVisible()
		})

		it('Enables tooltip after update', async () => {
			action = useTooltip(target, {
				...options,
				disabled: true,
			})
			action.update({
				disabled: false,
			})
			await _enter()
			expect(template).toBeVisible()
		})
	})

	describe('useTooltip props: position', () => {
		it('Positions tooltip on the left', async () => {
			action = useTooltip(target, {
				...options,
				position: 'left',
			})
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).toHaveClass('__tooltip-left')
		})

		it('Positions tooltip on the left after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'left',
			})
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).not.toHaveClass('__tooltip-top')
			expect(template.parentNode).toHaveClass('__tooltip-left')
		})

		it('Positions tooltip on the right', async () => {
			action = useTooltip(target, {
				...options,
				position: 'right',
			})
			await _enter()
			expect(template.parentNode.style.left).toHaveLength(0)
			expect(template.parentNode.style.right).not.toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).toHaveClass('__tooltip-right')
		})

		it('Positions tooltip on the right after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'right',
			})
			await _enter()
			expect(template.parentNode.style.left).toHaveLength(0)
			expect(template.parentNode.style.right).not.toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).not.toHaveClass('__tooltip-top')
			expect(template.parentNode).toHaveClass('__tooltip-right')
		})

		it('Positions tooltip at the top', async () => {
			action = useTooltip(target, options)
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).toHaveClass('__tooltip-top')
		})

		it('Positions tooltip at the top after update', async () => {
			action = useTooltip(target, {
				...options,
				position: 'left',
			})
			action.update({
				position: 'top',
			})
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).not.toHaveLength(0)
			expect(template.parentNode.style.bottom).toHaveLength(0)
			expect(template.parentNode).not.toHaveClass('__tooltip-left')
			expect(template.parentNode).toHaveClass('__tooltip-top')
		})

		it('Positions tooltip at the bottom', async () => {
			action = useTooltip(target, {
				...options,
				position: 'bottom',
			})
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).toHaveLength(0)
			expect(template.parentNode.style.bottom).not.toHaveLength(0)
			expect(template.parentNode).toHaveClass('__tooltip-bottom')
		})

		it('Positions tooltip at the bottom after update', async () => {
			action = useTooltip(target, options)
			action.update({
				position: 'bottom',
			})
			await _enter()
			expect(template.parentNode.style.left).not.toHaveLength(0)
			expect(template.parentNode.style.right).toHaveLength(0)
			expect(template.parentNode.style.top).toHaveLength(0)
			expect(template.parentNode.style.bottom).not.toHaveLength(0)
			expect(template.parentNode).not.toHaveClass('__tooltip-top')
			expect(template.parentNode).toHaveClass('__tooltip-bottom')
		})
	})

	describe('useTooltip props: enterDelay', () => {
		it('Delays tooltip appearance', async () => {
			action = useTooltip(target, {
				...options,
				enterDelay: 50,
			})
			await _enter()
			expect(template).not.toBeInTheDocument()
			await _sleep(100)
			expect(template).toBeInTheDocument()
		})

		it('Delays tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				enterDelay: 150,
			})
			await _enter()
			await _sleep(100)
			expect(template).not.toBeInTheDocument()
			await _sleep(100)
			expect(template).toBeInTheDocument()
		})
	})

	describe('useTooltip props: leaveDelay', () => {
		it('Delays tooltip disappearance', async () => {
			action = useTooltip(target, {
				...options,
				leaveDelay: 50,
			})
			await _enterAndLeave()
			expect(template).toBeInTheDocument()
			await _sleep(100)
			expect(template).not.toBeInTheDocument()
		})

		it('Delays tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				leaveDelay: 150,
			})
			await _enterAndLeave()
			await _sleep(100)
			expect(template).toBeInTheDocument()
			await _sleep(100)
			expect(template).not.toBeInTheDocument()
		})
	})

	describe('useTooltip props: animated', () => {
		it('Animates tooltip disappearance', async () => {
			action = useTooltip(target, {
				...options,
				animated: true,
			})
			await _enterAndLeave()
			expect(template).toBeInTheDocument()
			await fireEvent.animationEnd(template.parentNode)
			await _sleep(10)
			expect(template).not.toBeInTheDocument()
		})

		it('Animates tooltip disappearance after update', async () => {
			action = useTooltip(target, options)
			action.update({
				animated: true,
			})
			await _enterAndLeave()
			expect(template).toBeInTheDocument()
			await fireEvent.animationEnd(template.parentNode)
			await _sleep(10)
			expect(template).not.toBeInTheDocument()
		})
	})
})
