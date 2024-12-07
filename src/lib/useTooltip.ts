import Tooltip from './Tooltip';
import type { TooltipOptions } from './types';

import './useTooltip.css';

const useTooltip = (node: HTMLElement, options: TooltipOptions) => {
	const tooltip = new Tooltip(
		node,
		options.content,
		options.contentSelector,
		options.contentActions,
		options.containerClassName,
		options.position,
		options.animated,
		options.animationEnterClassName,
		options.animationLeaveClassName,
		options.enterDelay,
		options.leaveDelay,
		options.onEnter,
		options.onLeave,
		options.offset,
		options.disabled
	);

	return {
		update: (newOptions: TooltipOptions) =>
			tooltip.update(
				newOptions.content,
				newOptions.contentSelector,
				newOptions.contentActions,
				newOptions.containerClassName,
				newOptions.position,
				newOptions.animated,
				newOptions.animationEnterClassName,
				newOptions.animationLeaveClassName,
				newOptions.enterDelay,
				newOptions.leaveDelay,
				newOptions.onEnter,
				newOptions.onLeave,
				newOptions.offset,
				newOptions.disabled
			),
		destroy: () => tooltip.destroy()
	};
};

export default useTooltip;
