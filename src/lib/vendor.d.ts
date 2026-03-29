declare module '@untemps/dom-observer' {
	export class DOMObserver {
		static readonly EXIST: string;
		static readonly ADD: string;
		static readonly REMOVE: string;
		static readonly CHANGE: string;
		wait(
			target: string | Element,
			onEvent: null,
			options: { events: string[] }
		): Promise<{ node: HTMLElement & HTMLTemplateElement }>;
		clear(): void;
	}
}
