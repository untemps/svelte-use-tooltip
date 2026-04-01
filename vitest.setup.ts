import '@testing-library/jest-dom/vitest';
import { fireEvent } from '@testing-library/svelte';

import { standby } from '@untemps/utils/async/standby';

declare global {
	function _enter(trigger: Element): Promise<void>;
	function _leave(trigger: Element): Promise<void>;
	function _enterAndLeave(trigger: Element): Promise<void>;
	function _focus(trigger: Element): Promise<void>;
	function _blur(trigger: Element): Promise<void>;
	function _focusAndBlur(trigger: Element): Promise<void>;
	function _keyDown(trigger: Element, key?: object): Promise<void>;
}

global._enter = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await fireEvent.mouseOver(trigger); // fireEvent.mouseEnter only works if mouseOver is triggered before
		await fireEvent.mouseEnter(trigger);
		await standby(1);
		resolve();
	});

global._leave = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await fireEvent.mouseLeave(trigger);
		await standby(1);
		resolve();
	});

global._enterAndLeave = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await _enter(trigger);
		await _leave(trigger);
		resolve();
	});

global._focus = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await fireEvent.focusIn(trigger);
		await standby(1);
		resolve();
	});

global._blur = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await fireEvent.focusOut(trigger);
		await standby(1);
		resolve();
	});

global._focusAndBlur = async (trigger: Element) =>
	new Promise<void>(async (resolve) => {
		await _focus(trigger);
		await _blur(trigger);
		resolve();
	});

global._keyDown = async (trigger: Element, key?: object) =>
	new Promise<void>(async (resolve) => {
		await fireEvent.keyDown(trigger, key || { key: 'Escape', code: 'Escape', charCode: 27 });
		await standby(1);
		resolve();
	});
