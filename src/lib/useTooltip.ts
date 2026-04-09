import type { Action } from 'svelte/action';

import Tooltip from './Tooltip';
import type { TooltipOptions } from './Tooltip';

import './useTooltip.css';

export type { TooltipOptions };

const useTooltip: Action<HTMLElement, TooltipOptions> = (node, options = {}) => {
	const tooltip = new Tooltip(node, options);

	return {
		update: (newOptions: TooltipOptions) => tooltip.update(newOptions),
		destroy: () => tooltip.destroy()
	};
};

export default useTooltip;
