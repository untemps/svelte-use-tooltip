;(function (l, r) {
	if (!l || l.getElementById('livereloadscript')) return
	r = l.createElement('script')
	r.async = 1
	r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'
	r.id = 'livereloadscript'
	l.getElementsByTagName('head')[0].appendChild(r)
})(self.document)
var app = (function () {
	'use strict'

	function noop() {}
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char },
		}
	}
	function run(fn) {
		return fn()
	}
	function blank_object() {
		return Object.create(null)
	}
	function run_all(fns) {
		fns.forEach(run)
	}
	function is_function(thing) {
		return typeof thing === 'function'
	}
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function'
	}
	function is_empty(obj) {
		return Object.keys(obj).length === 0
	}
	function action_destroyer(action_result) {
		return action_result && is_function(action_result.destroy) ? action_result.destroy : noop
	}
	function append(target, node) {
		target.appendChild(node)
	}
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null)
	}
	function detach(node) {
		node.parentNode.removeChild(node)
	}
	function element(name) {
		return document.createElement(name)
	}
	function text(data) {
		return document.createTextNode(data)
	}
	function space() {
		return text(' ')
	}
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options)
		return () => node.removeEventListener(event, handler, options)
	}
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute)
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value)
	}
	function to_number(value) {
		return value === '' ? null : +value
	}
	function children(element) {
		return Array.from(element.childNodes)
	}
	function set_input_value(input, value) {
		input.value = value == null ? '' : value
	}
	function set_style(node, key, value, important) {
		node.style.setProperty(key, value, important ? 'important' : '')
	}
	function select_option(select, value) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i]
			if (option.__value === value) {
				option.selected = true
				return
			}
		}
		select.selectedIndex = -1 // no option should be selected
	}
	function select_value(select) {
		const selected_option = select.querySelector(':checked') || select.options[0]
		return selected_option && selected_option.__value
	}
	function custom_event(type, detail, bubbles = false) {
		const e = document.createEvent('CustomEvent')
		e.initCustomEvent(type, bubbles, false, detail)
		return e
	}

	let current_component
	function set_current_component(component) {
		current_component = component
	}

	const dirty_components = []
	const binding_callbacks = []
	const render_callbacks = []
	const flush_callbacks = []
	const resolved_promise = Promise.resolve()
	let update_scheduled = false
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true
			resolved_promise.then(flush)
		}
	}
	function add_render_callback(fn) {
		render_callbacks.push(fn)
	}
	let flushing = false
	const seen_callbacks = new Set()
	function flush() {
		if (flushing) return
		flushing = true
		do {
			// first, call beforeUpdate functions
			// and update components
			for (let i = 0; i < dirty_components.length; i += 1) {
				const component = dirty_components[i]
				set_current_component(component)
				update(component.$$)
			}
			set_current_component(null)
			dirty_components.length = 0
			while (binding_callbacks.length) binding_callbacks.pop()()
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i]
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback)
					callback()
				}
			}
			render_callbacks.length = 0
		} while (dirty_components.length)
		while (flush_callbacks.length) {
			flush_callbacks.pop()()
		}
		update_scheduled = false
		flushing = false
		seen_callbacks.clear()
	}
	function update($$) {
		if ($$.fragment !== null) {
			$$.update()
			run_all($$.before_update)
			const dirty = $$.dirty
			$$.dirty = [-1]
			$$.fragment && $$.fragment.p($$.ctx, dirty)
			$$.after_update.forEach(add_render_callback)
		}
	}
	const outroing = new Set()
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block)
			block.i(local)
		}
	}

	const globals = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : global
	function mount_component(component, target, anchor, customElement) {
		const { fragment, on_mount, on_destroy, after_update } = component.$$
		fragment && fragment.m(target, anchor)
		if (!customElement) {
			// onMount happens before the initial afterUpdate
			add_render_callback(() => {
				const new_on_destroy = on_mount.map(run).filter(is_function)
				if (on_destroy) {
					on_destroy.push(...new_on_destroy)
				} else {
					// Edge case - component was destroyed immediately,
					// most likely as a result of a binding initialising
					run_all(new_on_destroy)
				}
				component.$$.on_mount = []
			})
		}
		after_update.forEach(add_render_callback)
	}
	function destroy_component(component, detaching) {
		const $$ = component.$$
		if ($$.fragment !== null) {
			run_all($$.on_destroy)
			$$.fragment && $$.fragment.d(detaching)
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null
			$$.ctx = []
		}
	}
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component)
			schedule_update()
			component.$$.dirty.fill(0)
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31
	}
	function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
		const parent_component = current_component
		set_current_component(component)
		const $$ = (component.$$ = {
			fragment: null,
			ctx: null,
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root,
		})
		append_styles && append_styles($$.root)
		let ready = false
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value)
						if (ready) make_dirty(component, i)
					}
					return ret
			  })
			: []
		$$.update()
		ready = true
		run_all($$.before_update)
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false
		if (options.target) {
			if (options.hydrate) {
				const nodes = children(options.target)
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.l(nodes)
				nodes.forEach(detach)
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c()
			}
			if (options.intro) transition_in(component.$$.fragment)
			mount_component(component, options.target, options.anchor, options.customElement)
			flush()
		}
		set_current_component(parent_component)
	}
	/**
	 * Base class for Svelte components. Used when dev=false.
	 */
	class SvelteComponent {
		$destroy() {
			destroy_component(this, 1)
			this.$destroy = noop
		}
		$on(type, callback) {
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = [])
			callbacks.push(callback)
			return () => {
				const index = callbacks.indexOf(callback)
				if (index !== -1) callbacks.splice(index, 1)
			}
		}
		$set($$props) {
			if (this.$$set && !is_empty($$props)) {
				this.$$.skip_bound = true
				this.$$set($$props)
				this.$$.skip_bound = false
			}
		}
	}

	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true))
	}
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node })
		append(target, node)
	}
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor })
		insert(target, node, anchor)
	}
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node })
		detach(node)
	}
	function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
		const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : []
		if (has_prevent_default) modifiers.push('preventDefault')
		if (has_stop_propagation) modifiers.push('stopPropagation')
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers })
		const dispose = listen(node, event, handler, options)
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers })
			dispose()
		}
	}
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value)
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute })
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value })
	}
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`)
			}
		}
	}
	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 */
	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option")
			}
			super()
		}
		$destroy() {
			super.$destroy()
			this.$destroy = () => {
				console.warn('Component was already destroyed') // eslint-disable-line no-console
			}
		}
		$capture_state() {}
		$inject_state() {}
	}

	var t = function (t, e) {
			;(null == e || e > t.length) && (e = t.length)
			for (var n = 0, o = new Array(e); n < e; n++) o[n] = t[n]
			return o
		},
		e = function (e) {
			if (Array.isArray(e)) return t(e)
		},
		n = function (e, n) {
			if (e) {
				if ('string' == typeof e) return t(e, n)
				var o = Object.prototype.toString.call(e).slice(8, -1)
				return (
					'Object' === o && e.constructor && (o = e.constructor.name),
					'Map' === o || 'Set' === o
						? Array.from(e)
						: 'Arguments' === o || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(o)
						? t(e, n)
						: void 0
				)
			}
		},
		o = function (t) {
			return (
				e(t) ||
				(function (t) {
					if ('undefined' != typeof Symbol && Symbol.iterator in Object(t)) return Array.from(t)
				})(t) ||
				n(t) ||
				(function () {
					throw new TypeError(
						'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
					)
				})()
			)
		}
	function i(t, e) {
		for (var n = 0; n < e.length; n++) {
			var o = e[n]
			;(o.enumerable = o.enumerable || !1),
				(o.configurable = !0),
				'value' in o && (o.writable = !0),
				Object.defineProperty(t, o.key, o)
		}
	}
	var a = function (t, e, n) {
			return (
				e in t
					? Object.defineProperty(t, e, { value: n, enumerable: !0, configurable: !0, writable: !0 })
					: (t[e] = n),
				t
			)
		},
		r = function (t) {
			return 1 === (null == t ? void 0 : t.nodeType)
		}
	function s(t, e) {
		var n
		if ('undefined' == typeof Symbol || null == t[Symbol.iterator]) {
			if (
				Array.isArray(t) ||
				(n = (function (t, e) {
					if (t) {
						if ('string' == typeof t) return l(t, e)
						var n = Object.prototype.toString.call(t).slice(8, -1)
						return (
							'Object' === n && t.constructor && (n = t.constructor.name),
							'Map' === n || 'Set' === n
								? Array.from(t)
								: 'Arguments' === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
								? l(t, e)
								: void 0
						)
					}
				})(t)) ||
				(e && t && 'number' == typeof t.length)
			) {
				n && (t = n)
				var o = 0,
					i = function () {}
				return {
					s: i,
					n: function () {
						return o >= t.length ? { done: !0 } : { done: !1, value: t[o++] }
					},
					e: function (t) {
						throw t
					},
					f: i,
				}
			}
			throw new TypeError(
				'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
			)
		}
		var a,
			r = !0,
			s = !1
		return {
			s: function () {
				n = t[Symbol.iterator]()
			},
			n: function () {
				var t = n.next()
				return (r = t.done), t
			},
			e: function (t) {
				;(s = !0), (a = t)
			},
			f: function () {
				try {
					r || null == n.return || n.return()
				} finally {
					if (s) throw a
				}
			},
		}
	}
	function l(t, e) {
		;(null == e || e > t.length) && (e = t.length)
		for (var n = 0, o = new Array(e); n < e; n++) o[n] = t[n]
		return o
	}
	var c = (function () {
		function t() {
			;(function (t, e) {
				if (!(t instanceof e)) throw new TypeError('Cannot call a class as a function')
			})(this, t),
				a(this, '_observer', null)
		}
		return (
			(function (t, e, n) {
				e && i(t.prototype, e), n && i(t, n)
			})(t, [
				{
					key: 'wait',
					value: function (e) {
						var n = this,
							i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
							a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
							l = a.events,
							c = void 0 === l ? t.EVENTS : l,
							h = a.timeout,
							u = void 0 === h ? 0 : h,
							d = a.attributeFilter,
							p = void 0 === d ? void 0 : d,
							m = a.onError,
							v = void 0 === m ? void 0 : m
						return (
							this.clear(),
							new Promise(function (a, l) {
								var h = r(e) ? e : document.querySelector(e)
								h && c.includes(t.EXIST) && (i ? i(h, t.EXIST) : a({ node: h, event: t.EXIST })),
									u > 0 &&
										(n._timeout = setTimeout(function () {
											n.clear()
											var t = new Error(
												'[TIMEOUT]: Element '
													.concat(e, ' cannot be found after ')
													.concat(u, 'ms')
											)
											i ? null == v || v(t) : l(t)
										}, u)),
									(n._observer = new MutationObserver(function (n) {
										n.forEach(function (n) {
											var l,
												h = n.type,
												u = n.target,
												d = n.addedNodes,
												p = n.removedNodes,
												m = n.attributeName,
												v = n.oldValue
											if ('childList' === h && (c.includes(t.ADD) || c.includes(t.REMOVE))) {
												var y,
													f = s(
														[].concat(
															o(c.includes(t.ADD) ? Array.from(d) : []),
															o(c.includes(t.REMOVE) ? Array.from(p) : [])
														)
													)
												try {
													for (f.s(); !(y = f.n()).done; ) {
														var b,
															g = y.value
														;(g === e ||
															(!r(e) &&
																null !== (b = g.matches) &&
																void 0 !== b &&
																b.call(g, e))) &&
															(i
																? i(g, Array.from(d).includes(g) ? t.ADD : t.REMOVE)
																: a({
																		node: g,
																		event: Array.from(d).includes(g)
																			? t.ADD
																			: t.REMOVE,
																  }))
													}
												} catch (t) {
													f.e(t)
												} finally {
													f.f()
												}
											}
											'attributes' === h &&
												c.includes(t.CHANGE) &&
												(u === e ||
													(!r(e) &&
														null !== (l = u.matches) &&
														void 0 !== l &&
														l.call(u, e))) &&
												(i
													? i(u, t.CHANGE, { attributeName: m, oldValue: v })
													: a({
															node: u,
															event: t.CHANGE,
															options: { attributeName: m, oldValue: v },
													  }))
										})
									})),
									n._observer.observe(document.documentElement, {
										subtree: !0,
										childList: c.includes(t.ADD) || c.includes(t.REMOVE),
										attributes: c.includes(t.CHANGE),
										attributeOldValue: c.includes(t.CHANGE),
										attributeFilter: p,
									})
							})
						)
					},
				},
				{
					key: 'clear',
					value: function () {
						var t
						null === (t = this._observer) || void 0 === t || t.disconnect(), clearTimeout(this._timeout)
					},
				},
			]),
			t
		)
	})()
	a(c, 'EXIST', 'DOMObserver_exist'),
		a(c, 'ADD', 'DOMObserver_add'),
		a(c, 'REMOVE', 'DOMObserver_remove'),
		a(c, 'CHANGE', 'DOMObserver_change'),
		a(c, 'EVENTS', [c.EXIST, c.ADD, c.REMOVE, c.CHANGE])
	class h {
		static get GAP() {
			return 10
		}
		static #t = []
		#e = null
		#n = []
		#o = 0
		#i = 0
		#a = null
		#r = null
		#s = null
		#l = null
		#c = null
		#h = null
		#u = null
		#d = null
		#p = !1
		#m = null
		#v = null
		#y = !1
		#f = null
		#b = null
		static destroy() {
			h.#t.forEach((t) => {
				t.destroy()
			}),
				(h.#t = [])
		}
		constructor(t, e, n, o, i, a, r, s, l, u, d, p, m) {
			;(this.#c = t),
				(this.#h = e),
				(this.#u = n),
				(this.#p = o || !1),
				(this.#d = i),
				(this.#m = a),
				(this.#v = r || 'top'),
				(this.#y = s || !1),
				(this.#f = l || '__tooltip-enter'),
				(this.#b = u || '__tooltip-leave'),
				(this.#o = d || 0),
				(this.#i = p || 0),
				(this.#e = new c()),
				(this.#c.title = ''),
				this.#c.setAttribute('style', 'position: relative'),
				this.#g(),
				this.#r.classList.add(this.#m || '__tooltip', `__tooltip-${this.#v}`),
				m ? this.#E() : this.#T(),
				h.#t.push(this)
		}
		update(t, e, n, o, i, a, r, s, l, c, h, u) {
			const d = e !== this.#u || t !== this.#h,
				p = i !== this.#m,
				m = this.#v,
				v = a !== this.#v,
				y = u && this.#s,
				f = !u && !this.#s
			;(this.#h = t),
				(this.#u = e),
				(this.#p = n || !1),
				(this.#d = o),
				(this.#m = i),
				(this.#v = a || 'top'),
				(this.#y = r || !1),
				(this.#f = s || '__tooltip-enter'),
				(this.#b = l || '__tooltip-leave'),
				(this.#o = c || 0),
				(this.#i = h || 0),
				d && (this.#C(), this.#g()),
				(p || d) && this.#r.classList.add(this.#m || '__tooltip'),
				(v || p || d) &&
					(this.#r.classList.remove(`__tooltip-${m}`), this.#r.classList.add(`__tooltip-${this.#v}`)),
				y ? this.#E() : f && this.#T()
		}
		destroy() {
			var t
			this.#C(), this.#E(), this.#A(), null === (t = this.#e) || void 0 === t || t.clear(), (this.#e = null)
		}
		#T() {
			;(this.#s = this.#_.bind(this)),
				(this.#l = this.#D.bind(this)),
				this.#c.addEventListener('mouseenter', this.#s),
				this.#c.addEventListener('mouseleave', this.#l)
		}
		#E() {
			this.#c.removeEventListener('mouseenter', this.#s),
				this.#c.removeEventListener('mouseleave', this.#l),
				(this.#s = null),
				(this.#l = null)
		}
		#g() {
			if (((this.#r = document.createElement('div')), this.#u))
				this.#e.wait(this.#u, null, { events: [c.EXIST, c.ADD] }).then(({ node: t }) => {
					const e = this.#p ? t.cloneNode(!0) : t
					this.#r.appendChild(e)
				})
			else if (this.#h) {
				const t = document.createTextNode(this.#h)
				this.#r.appendChild(t)
			}
		}
		#N() {
			const { width: t, height: e } = this.#c.getBoundingClientRect(),
				{ width: n, height: o } = this.#r.getBoundingClientRect()
			switch (this.#v) {
				case 'left':
					;(this.#r.style.top = (-(o - e) >> 1) + 'px'),
						(this.#r.style.left = -n - h.GAP + 'px'),
						(this.#r.style.bottom = null),
						(this.#r.style.right = null)
					break
				case 'right':
					;(this.#r.style.top = (-(o - e) >> 1) + 'px'),
						(this.#r.style.right = -n - h.GAP + 'px'),
						(this.#r.style.bottom = null),
						(this.#r.style.left = null)
					break
				case 'bottom':
					;(this.#r.style.left = (-(n - t) >> 1) + 'px'),
						(this.#r.style.bottom = -o - h.GAP + 'px'),
						(this.#r.style.right = null),
						(this.#r.style.top = null)
					break
				default:
					;(this.#r.style.left = (-(n - t) >> 1) + 'px'),
						(this.#r.style.top = -o - h.GAP + 'px'),
						(this.#r.style.right = null),
						(this.#r.style.bottom = null)
			}
		}
		async #w() {
			this.#y && (await this.#S(1)),
				this.#c.appendChild(this.#r),
				this.#e.wait(this.#r, null, { events: [c.EXIST, c.ADD] }).then(() => {
					this.#N()
				}),
				this.#d &&
					Object.entries(this.#d).forEach(
						([t, { eventType: e, callback: n, callbackParams: o, closeOnCallback: i }]) => {
							const a = '*' === t ? this.#r : this.#r.querySelector(t)
							if (a) {
								const t = (t) => {
									null == n || n.apply(null, [...o, t]), i && this.#C()
								}
								a.addEventListener(e, t), this.#n.push({ trigger: a, eventType: e, listener: t })
							}
						}
					)
		}
		async #C() {
			this.#y && (await this.#S(0)),
				this.#r.remove(),
				this.#n.forEach(({ trigger: t, eventType: e, listener: n }) => t.removeEventListener(e, n)),
				(this.#n = [])
		}
		#L(t) {
			return (
				this.#A(),
				new Promise(
					(e) =>
						(this.#a = setTimeout(() => {
							this.#A(), e()
						}, t))
				)
			)
		}
		#A() {
			clearTimeout(this.#a), (this.#a = null)
		}
		#S(t) {
			return new Promise((e) => {
				let n, o
				if (1 === t) (n = this.#f), (o = this.#b)
				else (n = this.#b), (o = this.#f)
				this.#r.classList.add(n), this.#r.classList.remove(o), 1 === t && e()
				const i = () => {
					this.#r.removeEventListener('animationend', i), this.#r.classList.remove(n), e()
				}
				this.#r.addEventListener('animationend', i)
			})
		}
		async #_() {
			await this.#L(this.#o), await this.#w()
		}
		async #D() {
			await this.#L(this.#i), await this.#C()
		}
	}
	!(function (t, e) {
		void 0 === e && (e = {})
		var n = e.insertAt
		if (t && 'undefined' != typeof document) {
			var o = document.head || document.getElementsByTagName('head')[0],
				i = document.createElement('style')
			;(i.type = 'text/css'),
				'top' === n && o.firstChild ? o.insertBefore(i, o.firstChild) : o.appendChild(i),
				i.styleSheet ? (i.styleSheet.cssText = t) : i.appendChild(document.createTextNode(t))
		}
	})(
		".__tooltip {\n\tposition: absolute;\n\tz-index: 9999;\n\tmax-width: 100%;\n\tbackground-color: black;\n\tcolor: white;\n\ttext-align: center;\n\tborder-radius: 6px;\n\tpadding: 0.5rem;\n}\n\n.__tooltip::after {\n\tcontent: '';\n\tposition: absolute;\n\tmargin-left: -5px;\n\tborder-width: 5px;\n\tborder-style: solid;\n}\n\n.__tooltip-top::after {\n\tbottom: -10px;\n\tleft: 50%;\n\tborder-color: black transparent transparent transparent;\n}\n\n.__tooltip-bottom::after {\n\ttop: -10px;\n\tleft: 50%;\n\tborder-color: transparent transparent black transparent;\n}\n\n.__tooltip-left::after {\n\ttop: calc(50% - 5px);\n\tright: -10px;\n\tborder-color: transparent transparent transparent black;\n}\n\n.__tooltip-right::after {\n\ttop: calc(50% - 5px);\n\tleft: -5px;\n\tborder-color: transparent black transparent transparent;\n}\n\n.__tooltip-enter {\n\tanimation: fadeIn 0.2s linear forwards;\n}\n\n.__tooltip-leave {\n\tanimation: fadeOut 0.2s linear forwards;\n}\n\n@keyframes fadeIn {\n\tfrom {\n\t\topacity: 0;\n\t}\n\tto {\n\t\topacity: 1;\n\t}\n}\n@keyframes fadeOut {\n\tfrom {\n\t\topacity: 1;\n\t}\n\tto {\n\t\topacity: 0;\n\t}\n}\n"
	)
	var useTooltip = (
		t,
		{
			content: e,
			contentSelector: n,
			contentClone: o,
			contentActions: i,
			containerClassName: a,
			position: r,
			animated: s,
			animationEnterClassName: l,
			animationLeaveClassName: c,
			enterDelay: u,
			leaveDelay: d,
			disabled: p,
		}
	) => {
		const m = new h(t, e, n, o, i, a, r, s, l, c, u, d, p)
		return {
			update: ({
				content: t,
				contentSelector: e,
				contentClone: n,
				contentActions: o,
				containerClassName: i,
				position: a,
				animated: r,
				animationEnterClassName: s,
				animationLeaveClassName: l,
				enterDelay: c,
				leaveDelay: h,
				disabled: u,
			}) => m.update(t, e, n, o, i, a, r, s, l, c, h, u),
			destroy: () => m.destroy(),
		}
	}

	/* src\App.svelte generated by Svelte v3.44.0 */

	const { console: console_1 } = globals
	const file = 'src\\App.svelte'

	function create_fragment(ctx) {
		let main
		let div2
		let div0
		let useTooltip_action
		let t1
		let button0
		let t3
		let div1
		let button1
		let t5
		let form
		let h1
		let t7
		let fieldset0
		let label0
		let t8
		let span
		let t9
		let i
		let t11
		let strong
		let t13
		let t14
		let fieldset1
		let label1
		let t15
		let input0
		let t16
		let fieldset2
		let label2
		let t17
		let input1
		let t18
		let fieldset3
		let label3
		let t19
		let select
		let option0
		let option1
		let option2
		let option3
		let t24
		let fieldset4
		let label4
		let t25
		let input2
		let t26
		let fieldset5
		let label5
		let t27
		let input3
		let t28
		let fieldset6
		let label6
		let t29
		let input4
		let t30
		let fieldset7
		let label7
		let t31
		let input5
		let t32
		let fieldset8
		let label8
		let t33
		let input6
		let t34
		let fieldset9
		let label9
		let t35
		let input7
		let mounted
		let dispose

		const block = {
			c: function create() {
				main = element('main')
				div2 = element('div')
				div0 = element('div')
				div0.textContent = 'Hover me'
				t1 = space()
				button0 = element('button')
				button0.textContent = 'Settings'
				t3 = space()
				div1 = element('div')
				button1 = element('button')
				button1.textContent = 'Close'
				t5 = space()
				form = element('form')
				h1 = element('h1')
				h1.textContent = 'Settings'
				t7 = space()
				fieldset0 = element('fieldset')
				label0 = element('label')
				t8 = text('Default Tooltip Content:\r\n                        ')
				span = element('span')
				t9 = text("Hi! I'm a ")
				i = element('i')
				i.textContent = 'fancy'
				t11 = space()
				strong = element('strong')
				strong.textContent = 'tooltip'
				t13 = text('!')
				t14 = space()
				fieldset1 = element('fieldset')
				label1 = element('label')
				t15 = text('Tooltip Text Content:\r\n                        ')
				input0 = element('input')
				t16 = space()
				fieldset2 = element('fieldset')
				label2 = element('label')
				t17 = text('Use Custom Tooltip Class:\r\n                        ')
				input1 = element('input')
				t18 = space()
				fieldset3 = element('fieldset')
				label3 = element('label')
				t19 = text('Tooltip Position:\r\n                        ')
				select = element('select')
				option0 = element('option')
				option0.textContent = 'Left'
				option1 = element('option')
				option1.textContent = 'Right'
				option2 = element('option')
				option2.textContent = 'Top'
				option3 = element('option')
				option3.textContent = 'Bottom'
				t24 = space()
				fieldset4 = element('fieldset')
				label4 = element('label')
				t25 = text('Animate tooltip:\r\n                        ')
				input2 = element('input')
				t26 = space()
				fieldset5 = element('fieldset')
				label5 = element('label')
				t27 = text('Use Custom Tooltip Animation Enter Class:\r\n                        ')
				input3 = element('input')
				t28 = space()
				fieldset6 = element('fieldset')
				label6 = element('label')
				t29 = text('Use Custom Tooltip Animation Leave Class:\r\n                        ')
				input4 = element('input')
				t30 = space()
				fieldset7 = element('fieldset')
				label7 = element('label')
				t31 = text('Tooltip Enter Delay (ms):\r\n                        ')
				input5 = element('input')
				t32 = space()
				fieldset8 = element('fieldset')
				label8 = element('label')
				t33 = text('Tooltip Leave Delay (ms):\r\n                        ')
				input6 = element('input')
				t34 = space()
				fieldset9 = element('fieldset')
				label9 = element('label')
				t35 = text('Disable Tooltip:\r\n                        ')
				input7 = element('input')
				attr_dev(div0, 'class', 'target svelte-1sosalq')
				add_location(div0, file, 30, 8, 700)
				attr_dev(button0, 'class', 'container__settings-open svelte-1sosalq')
				add_location(button0, file, 56, 8, 1556)
				attr_dev(button1, 'class', 'settings__settings-close svelte-1sosalq')
				add_location(button1, file, 58, 12, 1753)
				add_location(h1, file, 60, 16, 1902)
				add_location(i, file, 64, 87, 2138)
				add_location(strong, file, 64, 100, 2151)
				attr_dev(span, 'id', 'tooltip__content')
				attr_dev(span, 'class', 'tooltip__content svelte-1sosalq')
				add_location(span, file, 64, 24, 2075)
				attr_dev(label0, 'for', 'tooltip__content')
				attr_dev(label0, 'class', 'svelte-1sosalq')
				add_location(label0, file, 62, 20, 1969)
				attr_dev(fieldset0, 'class', 'svelte-1sosalq')
				add_location(fieldset0, file, 61, 16, 1937)
				attr_dev(input0, 'type', 'text')
				attr_dev(input0, 'class', 'svelte-1sosalq')
				add_location(input0, file, 70, 24, 2372)
				attr_dev(label1, 'class', 'svelte-1sosalq')
				add_location(label1, file, 68, 20, 2292)
				attr_dev(fieldset1, 'class', 'svelte-1sosalq')
				add_location(fieldset1, file, 67, 16, 2260)
				attr_dev(input1, 'type', 'checkbox')
				attr_dev(input1, 'class', 'svelte-1sosalq')
				add_location(input1, file, 76, 24, 2617)
				attr_dev(label2, 'class', 'svelte-1sosalq')
				add_location(label2, file, 74, 20, 2533)
				attr_dev(fieldset2, 'class', 'svelte-1sosalq')
				add_location(fieldset2, file, 73, 16, 2501)
				option0.__value = 'left'
				option0.value = option0.__value
				add_location(option0, file, 83, 28, 2930)
				option1.__value = 'right'
				option1.value = option1.__value
				add_location(option1, file, 84, 28, 2994)
				option2.__value = 'top'
				option2.value = option2.__value
				add_location(option2, file, 85, 28, 3060)
				option3.__value = 'bottom'
				option3.value = option3.__value
				add_location(option3, file, 86, 28, 3122)
				if (/*tooltipPosition*/ ctx[3] === void 0)
					add_render_callback(() => /*select_change_handler*/ ctx[15].call(select))
				add_location(select, file, 82, 24, 2863)
				attr_dev(label3, 'class', 'svelte-1sosalq')
				add_location(label3, file, 80, 20, 2787)
				attr_dev(fieldset3, 'class', 'svelte-1sosalq')
				add_location(fieldset3, file, 79, 16, 2755)
				attr_dev(input2, 'type', 'checkbox')
				attr_dev(input2, 'class', 'svelte-1sosalq')
				add_location(input2, file, 93, 24, 3379)
				attr_dev(label4, 'class', 'svelte-1sosalq')
				add_location(label4, file, 91, 20, 3304)
				attr_dev(fieldset4, 'class', 'svelte-1sosalq')
				add_location(fieldset4, file, 90, 16, 3272)
				attr_dev(input3, 'type', 'checkbox')
				attr_dev(input3, 'class', 'svelte-1sosalq')
				add_location(input3, file, 99, 24, 3642)
				attr_dev(label5, 'class', 'svelte-1sosalq')
				add_location(label5, file, 97, 20, 3542)
				attr_dev(fieldset5, 'class', 'svelte-1sosalq')
				add_location(fieldset5, file, 96, 16, 3510)
				attr_dev(input4, 'type', 'checkbox')
				attr_dev(input4, 'class', 'svelte-1sosalq')
				add_location(input4, file, 105, 24, 3919)
				attr_dev(label6, 'class', 'svelte-1sosalq')
				add_location(label6, file, 103, 20, 3819)
				attr_dev(fieldset6, 'class', 'svelte-1sosalq')
				add_location(fieldset6, file, 102, 16, 3787)
				attr_dev(input5, 'type', 'number')
				attr_dev(input5, 'step', 100)
				attr_dev(input5, 'min', 0)
				attr_dev(input5, 'class', 'svelte-1sosalq')
				add_location(input5, file, 111, 24, 4180)
				attr_dev(label7, 'class', 'svelte-1sosalq')
				add_location(label7, file, 109, 20, 4096)
				attr_dev(fieldset7, 'class', 'svelte-1sosalq')
				add_location(fieldset7, file, 108, 16, 4064)
				attr_dev(input6, 'type', 'number')
				attr_dev(input6, 'step', 100)
				attr_dev(input6, 'min', 0)
				attr_dev(input6, 'class', 'svelte-1sosalq')
				add_location(input6, file, 117, 24, 4445)
				attr_dev(label8, 'class', 'svelte-1sosalq')
				add_location(label8, file, 115, 20, 4361)
				attr_dev(fieldset8, 'class', 'svelte-1sosalq')
				add_location(fieldset8, file, 114, 16, 4329)
				attr_dev(input7, 'type', 'checkbox')
				attr_dev(input7, 'class', 'svelte-1sosalq')
				add_location(input7, file, 123, 24, 4701)
				attr_dev(label9, 'class', 'svelte-1sosalq')
				add_location(label9, file, 121, 20, 4626)
				attr_dev(fieldset9, 'class', 'svelte-1sosalq')
				add_location(fieldset9, file, 120, 16, 4594)
				attr_dev(form, 'class', 'settings__form svelte-1sosalq')
				add_location(form, file, 59, 12, 1855)
				attr_dev(div1, 'class', 'settings__container svelte-1sosalq')
				set_style(div1, '--settingsVisibility', /*settingsVisibility*/ ctx[0])
				add_location(div1, file, 57, 8, 1656)
				attr_dev(div2, 'class', 'container svelte-1sosalq')
				add_location(div2, file, 29, 4, 667)
				attr_dev(main, 'class', 'svelte-1sosalq')
				add_location(main, file, 28, 0, 655)
			},
			l: function claim(nodes) {
				throw new Error(
					'options.hydrate only works if the component was compiled with the `hydratable: true` option'
				)
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor)
				append_dev(main, div2)
				append_dev(div2, div0)
				append_dev(div2, t1)
				append_dev(div2, button0)
				append_dev(div2, t3)
				append_dev(div2, div1)
				append_dev(div1, button1)
				append_dev(div1, t5)
				append_dev(div1, form)
				append_dev(form, h1)
				append_dev(form, t7)
				append_dev(form, fieldset0)
				append_dev(fieldset0, label0)
				append_dev(label0, t8)
				append_dev(label0, span)
				append_dev(span, t9)
				append_dev(span, i)
				append_dev(span, t11)
				append_dev(span, strong)
				append_dev(span, t13)
				append_dev(form, t14)
				append_dev(form, fieldset1)
				append_dev(fieldset1, label1)
				append_dev(label1, t15)
				append_dev(label1, input0)
				set_input_value(input0, /*tooltipTextContent*/ ctx[1])
				append_dev(form, t16)
				append_dev(form, fieldset2)
				append_dev(fieldset2, label2)
				append_dev(label2, t17)
				append_dev(label2, input1)
				input1.checked = /*useCustomTooltipClass*/ ctx[2]
				append_dev(form, t18)
				append_dev(form, fieldset3)
				append_dev(fieldset3, label3)
				append_dev(label3, t19)
				append_dev(label3, select)
				append_dev(select, option0)
				append_dev(select, option1)
				append_dev(select, option2)
				append_dev(select, option3)
				select_option(select, /*tooltipPosition*/ ctx[3])
				append_dev(form, t24)
				append_dev(form, fieldset4)
				append_dev(fieldset4, label4)
				append_dev(label4, t25)
				append_dev(label4, input2)
				input2.checked = /*animateTooltip*/ ctx[5]
				append_dev(form, t26)
				append_dev(form, fieldset5)
				append_dev(fieldset5, label5)
				append_dev(label5, t27)
				append_dev(label5, input3)
				input3.checked = /*useCustomAnimationEnterClass*/ ctx[6]
				append_dev(form, t28)
				append_dev(form, fieldset6)
				append_dev(fieldset6, label6)
				append_dev(label6, t29)
				append_dev(label6, input4)
				input4.checked = /*useCustomAnimationLeaveClass*/ ctx[7]
				append_dev(form, t30)
				append_dev(form, fieldset7)
				append_dev(fieldset7, label7)
				append_dev(label7, t31)
				append_dev(label7, input5)
				set_input_value(input5, /*tooltipEnterDelay*/ ctx[8])
				append_dev(form, t32)
				append_dev(form, fieldset8)
				append_dev(fieldset8, label8)
				append_dev(label8, t33)
				append_dev(label8, input6)
				set_input_value(input6, /*tooltipLeaveDelay*/ ctx[9])
				append_dev(form, t34)
				append_dev(form, fieldset9)
				append_dev(fieldset9, label9)
				append_dev(label9, t35)
				append_dev(label9, input7)
				input7.checked = /*isTooltipDisabled*/ ctx[4]

				if (!mounted) {
					dispose = [
						action_destroyer(
							(useTooltip_action = useTooltip.call(null, div0, {
								position: /*tooltipPosition*/ ctx[3],
								content: /*tooltipTextContent*/ ctx[1],
								contentSelector: !(/*tooltipTextContent*/ ctx[1]?.length) ? '.tooltip__content' : null,
								contentClone: true,
								contentActions: {
									'*': {
										eventType: 'click',
										callback: /*_onTooltipClick*/ ctx[10],
										callbackParams: ['ok'],
										closeOnCallback: true,
									},
								},
								containerClassName: /*useCustomTooltipClass*/ ctx[2] ? 'tooltip' : null,
								animated: /*animateTooltip*/ ctx[5],
								animationEnterClassName: /*useCustomAnimationEnterClass*/ ctx[6]
									? 'tooltip-enter'
									: null,
								animationLeaveClassName: /*useCustomAnimationLeaveClass*/ ctx[7]
									? 'tooltip-leave'
									: null,
								enterDelay: /*tooltipEnterDelay*/ ctx[8],
								leaveDelay: /*tooltipLeaveDelay*/ ctx[9],
								disabled: /*isTooltipDisabled*/ ctx[4],
							}))
						),
						listen_dev(button0, 'click', /*_onSettingsOpenClick*/ ctx[11], false, false, false),
						listen_dev(button1, 'click', /*_onSettingsCloseClick*/ ctx[12], false, false, false),
						listen_dev(input0, 'input', /*input0_input_handler*/ ctx[13]),
						listen_dev(input1, 'change', /*input1_change_handler*/ ctx[14]),
						listen_dev(select, 'change', /*select_change_handler*/ ctx[15]),
						listen_dev(input2, 'change', /*input2_change_handler*/ ctx[16]),
						listen_dev(input3, 'change', /*input3_change_handler*/ ctx[17]),
						listen_dev(input4, 'change', /*input4_change_handler*/ ctx[18]),
						listen_dev(input5, 'input', /*input5_input_handler*/ ctx[19]),
						listen_dev(input6, 'input', /*input6_input_handler*/ ctx[20]),
						listen_dev(input7, 'change', /*input7_change_handler*/ ctx[21]),
					]

					mounted = true
				}
			},
			p: function update(ctx, [dirty]) {
				if (
					useTooltip_action &&
					is_function(useTooltip_action.update) &&
					dirty &
						/*tooltipPosition, tooltipTextContent, useCustomTooltipClass, animateTooltip, useCustomAnimationEnterClass, useCustomAnimationLeaveClass, tooltipEnterDelay, tooltipLeaveDelay, isTooltipDisabled*/ 1022
				)
					useTooltip_action.update.call(null, {
						position: /*tooltipPosition*/ ctx[3],
						content: /*tooltipTextContent*/ ctx[1],
						contentSelector: !(/*tooltipTextContent*/ ctx[1]?.length) ? '.tooltip__content' : null,
						contentClone: true,
						contentActions: {
							'*': {
								eventType: 'click',
								callback: /*_onTooltipClick*/ ctx[10],
								callbackParams: ['ok'],
								closeOnCallback: true,
							},
						},
						containerClassName: /*useCustomTooltipClass*/ ctx[2] ? 'tooltip' : null,
						animated: /*animateTooltip*/ ctx[5],
						animationEnterClassName: /*useCustomAnimationEnterClass*/ ctx[6] ? 'tooltip-enter' : null,
						animationLeaveClassName: /*useCustomAnimationLeaveClass*/ ctx[7] ? 'tooltip-leave' : null,
						enterDelay: /*tooltipEnterDelay*/ ctx[8],
						leaveDelay: /*tooltipLeaveDelay*/ ctx[9],
						disabled: /*isTooltipDisabled*/ ctx[4],
					})

				if (dirty & /*tooltipTextContent*/ 2 && input0.value !== /*tooltipTextContent*/ ctx[1]) {
					set_input_value(input0, /*tooltipTextContent*/ ctx[1])
				}

				if (dirty & /*useCustomTooltipClass*/ 4) {
					input1.checked = /*useCustomTooltipClass*/ ctx[2]
				}

				if (dirty & /*tooltipPosition*/ 8) {
					select_option(select, /*tooltipPosition*/ ctx[3])
				}

				if (dirty & /*animateTooltip*/ 32) {
					input2.checked = /*animateTooltip*/ ctx[5]
				}

				if (dirty & /*useCustomAnimationEnterClass*/ 64) {
					input3.checked = /*useCustomAnimationEnterClass*/ ctx[6]
				}

				if (dirty & /*useCustomAnimationLeaveClass*/ 128) {
					input4.checked = /*useCustomAnimationLeaveClass*/ ctx[7]
				}

				if (dirty & /*tooltipEnterDelay*/ 256 && to_number(input5.value) !== /*tooltipEnterDelay*/ ctx[8]) {
					set_input_value(input5, /*tooltipEnterDelay*/ ctx[8])
				}

				if (dirty & /*tooltipLeaveDelay*/ 512 && to_number(input6.value) !== /*tooltipLeaveDelay*/ ctx[9]) {
					set_input_value(input6, /*tooltipLeaveDelay*/ ctx[9])
				}

				if (dirty & /*isTooltipDisabled*/ 16) {
					input7.checked = /*isTooltipDisabled*/ ctx[4]
				}

				if (dirty & /*settingsVisibility*/ 1) {
					set_style(div1, '--settingsVisibility', /*settingsVisibility*/ ctx[0])
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(main)
				mounted = false
				run_all(dispose)
			},
		}

		dispatch_dev('SvelteRegisterBlock', {
			block,
			id: create_fragment.name,
			type: 'component',
			source: '',
			ctx,
		})

		return block
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props
		validate_slots('App', slots, [])
		let settingsVisibility = 'hidden'
		let tooltipTextContent = null
		let useCustomTooltipClass = false
		let tooltipPosition = 'top'
		let isTooltipDisabled = false
		let animateTooltip = false
		let useCustomAnimationEnterClass = false
		let useCustomAnimationLeaveClass = false
		let tooltipEnterDelay = 200
		let tooltipLeaveDelay = 200

		const _onTooltipClick = (arg) => {
			console.log(arg)
		}

		const _onSettingsOpenClick = () => {
			$$invalidate(0, (settingsVisibility = 'visible'))
		}

		const _onSettingsCloseClick = () => {
			$$invalidate(0, (settingsVisibility = 'hidden'))
		}

		const writable_props = []

		Object.keys($$props).forEach((key) => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot')
				console_1.warn(`<App> was created with unknown prop '${key}'`)
		})

		function input0_input_handler() {
			tooltipTextContent = this.value
			$$invalidate(1, tooltipTextContent)
		}

		function input1_change_handler() {
			useCustomTooltipClass = this.checked
			$$invalidate(2, useCustomTooltipClass)
		}

		function select_change_handler() {
			tooltipPosition = select_value(this)
			$$invalidate(3, tooltipPosition)
		}

		function input2_change_handler() {
			animateTooltip = this.checked
			$$invalidate(5, animateTooltip)
		}

		function input3_change_handler() {
			useCustomAnimationEnterClass = this.checked
			$$invalidate(6, useCustomAnimationEnterClass)
		}

		function input4_change_handler() {
			useCustomAnimationLeaveClass = this.checked
			$$invalidate(7, useCustomAnimationLeaveClass)
		}

		function input5_input_handler() {
			tooltipEnterDelay = to_number(this.value)
			$$invalidate(8, tooltipEnterDelay)
		}

		function input6_input_handler() {
			tooltipLeaveDelay = to_number(this.value)
			$$invalidate(9, tooltipLeaveDelay)
		}

		function input7_change_handler() {
			isTooltipDisabled = this.checked
			$$invalidate(4, isTooltipDisabled)
		}

		$$self.$capture_state = () => ({
			useTooltip,
			settingsVisibility,
			tooltipTextContent,
			useCustomTooltipClass,
			tooltipPosition,
			isTooltipDisabled,
			animateTooltip,
			useCustomAnimationEnterClass,
			useCustomAnimationLeaveClass,
			tooltipEnterDelay,
			tooltipLeaveDelay,
			_onTooltipClick,
			_onSettingsOpenClick,
			_onSettingsCloseClick,
		})

		$$self.$inject_state = ($$props) => {
			if ('settingsVisibility' in $$props) $$invalidate(0, (settingsVisibility = $$props.settingsVisibility))
			if ('tooltipTextContent' in $$props) $$invalidate(1, (tooltipTextContent = $$props.tooltipTextContent))
			if ('useCustomTooltipClass' in $$props)
				$$invalidate(2, (useCustomTooltipClass = $$props.useCustomTooltipClass))
			if ('tooltipPosition' in $$props) $$invalidate(3, (tooltipPosition = $$props.tooltipPosition))
			if ('isTooltipDisabled' in $$props) $$invalidate(4, (isTooltipDisabled = $$props.isTooltipDisabled))
			if ('animateTooltip' in $$props) $$invalidate(5, (animateTooltip = $$props.animateTooltip))
			if ('useCustomAnimationEnterClass' in $$props)
				$$invalidate(6, (useCustomAnimationEnterClass = $$props.useCustomAnimationEnterClass))
			if ('useCustomAnimationLeaveClass' in $$props)
				$$invalidate(7, (useCustomAnimationLeaveClass = $$props.useCustomAnimationLeaveClass))
			if ('tooltipEnterDelay' in $$props) $$invalidate(8, (tooltipEnterDelay = $$props.tooltipEnterDelay))
			if ('tooltipLeaveDelay' in $$props) $$invalidate(9, (tooltipLeaveDelay = $$props.tooltipLeaveDelay))
		}

		if ($$props && '$$inject' in $$props) {
			$$self.$inject_state($$props.$$inject)
		}

		return [
			settingsVisibility,
			tooltipTextContent,
			useCustomTooltipClass,
			tooltipPosition,
			isTooltipDisabled,
			animateTooltip,
			useCustomAnimationEnterClass,
			useCustomAnimationLeaveClass,
			tooltipEnterDelay,
			tooltipLeaveDelay,
			_onTooltipClick,
			_onSettingsOpenClick,
			_onSettingsCloseClick,
			input0_input_handler,
			input1_change_handler,
			select_change_handler,
			input2_change_handler,
			input3_change_handler,
			input4_change_handler,
			input5_input_handler,
			input6_input_handler,
			input7_change_handler,
		]
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options)
			init(this, options, instance, create_fragment, safe_not_equal, {})

			dispatch_dev('SvelteRegisterComponent', {
				component: this,
				tagName: 'App',
				options,
				id: create_fragment.name,
			})
		}
	}

	const app = new App({
		target: document.body,
	})

	return app
})()
//# sourceMappingURL=bundle.js.map
