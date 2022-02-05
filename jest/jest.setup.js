import { fireEvent } from '@testing-library/svelte'

const { toBeInTheDocument, toHaveAttribute, toHaveStyle } = require('@testing-library/jest-dom/matchers')
import '@testing-library/jest-dom/extend-expect'

expect.extend({ toBeInTheDocument, toHaveAttribute, toHaveStyle })

global._createAndAddElement = (tagName, attrs, parent) => {
	const el = document.createElement(tagName)
	el.setAttribute('id', 'foo')
	for (let key in attrs) {
		el.setAttribute(key, attrs[key])
	}
	;(parent || document.body).appendChild(el)
	return el
}

global._destroyElement = (selector) => {
	const el = document.querySelector(selector)
	if (!!el) {
		el.parentNode.removeChild(el)
	}
}

global._modifyElement = (selector, attributeName, attributeValue) => {
	const el = document.querySelector(selector)
	if (!!el) {
		el.setAttribute(attributeName, attributeValue)
	}
}

global._getElement = (selector) => {
	return document.querySelector(selector)
}

global._sleep = (ms = 100) => {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

global._enter = async (trigger) =>
	new Promise(async (resolve) => {
		await fireEvent.mouseOver(trigger) // fireEvent.mouseEnter only works if mouseOver is triggered before
		await fireEvent.mouseEnter(trigger)
		await _sleep(1)
		resolve()
	})

global._leave = async (trigger) =>
	new Promise(async (resolve) => {
		await fireEvent.mouseLeave(trigger)
		await _sleep(1)
		resolve()
	})

global._enterAndLeave = async (trigger) =>
	new Promise(async (resolve) => {
		await _enter(trigger)
		await _leave(trigger)
		resolve()
	})

global._focus = async (trigger) =>
	new Promise(async (resolve) => {
		await fireEvent.focusIn(trigger)
		await _sleep(1)
		resolve()
	})

global._blur = async (trigger) =>
	new Promise(async (resolve) => {
		await fireEvent.focusOut(trigger)
		await _sleep(1)
		resolve()
	})

global._focusAndBlur = async (trigger) =>
	new Promise(async (resolve) => {
		await _focus(trigger)
		await _blur(trigger)
		resolve()
	})

global._keyDown = async (trigger, key) =>
	new Promise(async (resolve) => {
		await fireEvent.keyDown(trigger, key || { key: 'Escape', code: 'Escape', charCode: 27 })
		await _sleep(1)
		resolve()
	})
