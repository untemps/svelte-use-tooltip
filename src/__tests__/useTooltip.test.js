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

	beforeEach(() => {
		target = _createElement('target')
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
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(template).toBeInTheDocument()
			})

			it('Hides tooltip on mouse leave', async () => {
				action = useTooltip(target, options)
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				await fireEvent.mouseLeave(target)
				expect(template).not.toBeInTheDocument()
				await fireEvent.animationEnd(template.parentNode)
				expect(template).not.toBeInTheDocument()
			})

			it('Hides tooltip on mouse leave when animated', async () => {
				action = useTooltip(target, { ...options, animated: true })
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				await fireEvent.mouseLeave(target)
				expect(template).toBeInTheDocument()
				await fireEvent.animationEnd(template.parentNode)
				expect(template).not.toBeInTheDocument()
			})

			it('Disables tooltip', async () => {
				action = useTooltip(target, { ...options, disabled: true })
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(template).not.toBeVisible()
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
					...options,
					contentSelector: '#new-template',
				})
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(newTemplate).toBeVisible()
			})

			it('Disables tooltip', async () => {
				action = useTooltip(target, options)
				action.update({
					...options,
					disabled: true,
				})
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(template).not.toBeVisible()
			})

			it('Enables tooltip', async () => {
				action = useTooltip(target, { ...options, disabled: true })
				action.update({
					...options,
					disabled: false,
				})
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(template).toBeVisible()
			})
		})
	})

	describe('useTooltip lifecycle', () => {
		it('Destroys tooltip', async () => {
			action = useTooltip(target, options)
			action.destroy()
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template).not.toBeVisible()
		})
	})

	describe('useTooltip content', () => {
		it('Displays text content', async () => {
			const content = 'Foo'
			action = useTooltip(target, { ...options, contentSelector: null, content })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(target).toHaveTextContent(content)
		})

		it('Displays content element over text', async () => {
			const content = 'Foo'
			action = useTooltip(target, { ...options, content })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(target).not.toHaveTextContent(content)
			expect(template).toBeInTheDocument()
		})
	})

	describe('useTooltip props: contentActions', () => {
		it('Triggers callback on tooltip click', async () => {
			action = useTooltip(target, options)
			const contentAction = options.contentActions['*']
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			await fireEvent.click(template)
			expect(contentAction.callback).toHaveBeenCalledWith(contentAction.callbackParams[0], expect.any(Event))
			expect(template).toBeInTheDocument()
		})

		it('Closes tooltip after triggering callback', async () => {
			action = useTooltip(target, options)
			options.contentActions['*'].closeOnCallback = true
			const contentAction = options.contentActions['*']
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
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
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
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
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
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
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template.parentNode).toHaveClass('__tooltip')
		})

		it('Updates tooltip class', async () => {
			action = useTooltip(target, options)
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template.parentNode).toHaveClass('__tooltip')
			action.update({
				...options,
				containerClassName: '__custom-tooltip',
			})
			expect(template.parentNode).toHaveClass('__custom-tooltip')
		})

		it('Sets tooltip custom class', async () => {
			action = useTooltip(target, { ...options, containerClassName: '__custom-tooltip' })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template.parentNode).toHaveClass('__custom-tooltip')
		})
	})

	describe('useTooltip props: disabled', () => {
		it('Prevents from showing tooltip if immediately disabled', async () => {
			action = useTooltip(target, { ...options, disabled: true })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template).not.toBeVisible()
		})

		it('Prevents from showing tooltip if disabled after update', async () => {
			action = useTooltip(target, options)
			action.update({ ...options, disabled: true })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template).not.toBeVisible()
		})
	})

	describe('useTooltip props: position', () => {
		it('Updates tooltip position: from left to right', async () => {
			action = useTooltip(target, { ...options, position: 'left' })
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			const left = template.parentNode.style.left
			const top = template.parentNode.style.top

			action.update({
				...options,
				position: 'right',
			})
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			expect(template.parentNode.style.left).not.toBe(left)
			expect(template.parentNode.style.top).toBe(top)
		})

		it('Updates tooltip position: from top to bottom', async () => {
			action = useTooltip(target, options)
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			const left = template.parentNode.style.left
			const top = template.parentNode.style.top
			const bottom = template.parentNode.style.bottom

			action.update({
				...options,
				position: 'bottom',
			})
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			expect(template.parentNode.style.left).toBe(left)
			expect(template.parentNode.style.top).not.toBe(top)
			expect(template.parentNode.style.bottom).not.toBe(bottom)
		})

		it('Updates tooltip position: from top to left', async () => {
			action = useTooltip(target, options)
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			const left = template.parentNode.style.left
			const top = template.parentNode.style.top

			action.update({
				...options,
				position: 'left',
			})
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)

			expect(template.parentNode.style.left).not.toBe(left)
			expect(template.parentNode.style.top).not.toBe(top)
		})
	})
})
