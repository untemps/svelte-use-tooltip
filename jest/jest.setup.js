const { toBeInTheDocument, toHaveAttribute, toHaveStyle } = require('@testing-library/jest-dom/matchers')
import '@testing-library/jest-dom/extend-expect'

expect.extend({ toBeInTheDocument, toHaveAttribute, toHaveStyle })

global._createElement = (id = 'foo', attrs) => {
	const el = document.createElement('div')
	el.setAttribute('id', id)
	for (let key in attrs) {
		el.setAttribute(key, attrs[key])
	}
	document.body.appendChild(el)
	return el
}

global._removeElement = (selector) => {
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

global._sleep = (ms = 100) => {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
