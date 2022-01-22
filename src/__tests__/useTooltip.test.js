/**
 * @jest-environment jsdom
 */

import { fireEvent } from '@testing-library/svelte'

import useTooltip, { Tooltip } from '../useTooltip'

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
				await fireEvent.animationEnd(template.parentNode)
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
					...options,
					contentSelector: '#new-template'
				})
				await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
				await fireEvent.mouseEnter(target)
				expect(newTemplate).toBeVisible()
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

	describe('useTooltip props: contentClassName', () => {
		it('Sets tooltip default class', async () => {
			action = useTooltip(target, options)
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template.parentNode).toHaveClass('__tooltip__default')
		})

		it('Sets new tooltip class after update', async () => {
			action = useTooltip(target, options)
			await fireEvent.mouseOver(target) // fireEvent.mouseEnter only works if mouseOver is triggered before
			await fireEvent.mouseEnter(target)
			expect(template.parentNode).toHaveClass('__tooltip__default')
			action.update({
				...options,
				contentClassName: 'foo',
			})
			expect(template.parentNode).toHaveClass('foo')
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
})
