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
	function _touchStart(trigger: Element): Promise<void>;
	function _touchEnd(trigger: Element): Promise<void>;
	function _touchCancel(trigger: Element): Promise<void>;
}

global._enter = async (trigger: Element) => {
	await fireEvent.mouseOver(trigger); // fireEvent.mouseEnter only works if mouseOver is triggered before
	await fireEvent.mouseEnter(trigger);
	await standby(1);
};

global._leave = async (trigger: Element) => {
	await fireEvent.mouseLeave(trigger);
	await standby(1);
};

global._enterAndLeave = async (trigger: Element) => {
	await _enter(trigger);
	await _leave(trigger);
};

global._focus = async (trigger: Element) => {
	await fireEvent.focusIn(trigger);
	await standby(1);
};

global._blur = async (trigger: Element) => {
	await fireEvent.focusOut(trigger);
	await standby(1);
};

global._focusAndBlur = async (trigger: Element) => {
	await _focus(trigger);
	await _blur(trigger);
};

global._keyDown = async (trigger: Element, key?: object) => {
	await fireEvent.keyDown(trigger, key || { key: 'Escape', code: 'Escape', charCode: 27 });
	await standby(1);
};

global._touchStart = async (trigger: Element) => {
	await fireEvent.touchStart(trigger);
	await standby(1);
};

global._touchEnd = async (trigger: Element) => {
	await fireEvent.touchEnd(trigger);
	await standby(1);
};

global._touchCancel = async (trigger: Element) => {
	await fireEvent.touchCancel(trigger);
	await standby(1);
};
