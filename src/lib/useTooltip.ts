import type { Action } from 'svelte/action';

import Tooltip from './Tooltip.js';
import type { TooltipOptions } from './Tooltip.js';

import './useTooltip.css';

export type { TooltipOptions };
export type { ContentAction, ContentActionValue, ContentActions } from './Tooltip.js';

const useTooltip: Action<HTMLElement, TooltipOptions> = (node, options = {}) => {
	const tooltip = new Tooltip(node, options);

	return {
		update: (newOptions: TooltipOptions) => tooltip.update(newOptions),
		destroy: () => tooltip.destroy()
	};
};

export default useTooltip;
