import type { Action } from 'svelte/action';

import Tooltip from './Tooltip';
import type { ContentActions, TooltipPosition } from './Tooltip';

import './useTooltip.css';

export interface TooltipOptions {
	content?: string | null;
	contentSelector?: string | null;
	contentActions?: ContentActions | null;
	containerClassName?: string | null;
	position?: TooltipPosition;
	animated?: boolean;
	animationEnterClassName?: string | null;
	animationLeaveClassName?: string | null;
	enterDelay?: number;
	leaveDelay?: number;
	onEnter?: (() => void) | null;
	onLeave?: (() => void) | null;
	offset?: number;
	width?: string;
	disabled?: boolean;
}

const useTooltip: Action<HTMLElement, TooltipOptions> = (
	node,
	{
		content,
		contentSelector,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		enterDelay,
		leaveDelay,
		onEnter,
		onLeave,
		offset,
		width,
		disabled
	} = {}
) => {
	const tooltip = new Tooltip(
		node,
		content,
		contentSelector,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		enterDelay,
		leaveDelay,
		onEnter,
		onLeave,
		offset,
		width,
		disabled
	);

	return {
		update: ({
			content: newContent,
			contentSelector: newContentSelector,
			contentActions: newContentActions,
			containerClassName: newContainerClassName,
			position: newPosition,
			animated: newAnimated,
			animationEnterClassName: newAnimationEnterClassName,
			animationLeaveClassName: newAnimationLeaveClassName,
			enterDelay: newEnterDelay,
			leaveDelay: newLeaveDelay,
			onEnter: newOnEnter,
			onLeave: newOnLeave,
			offset: newOffset,
			width: newWidth,
			disabled: newDisabled
		}: TooltipOptions) =>
			tooltip.update(
				newContent,
				newContentSelector,
				newContentActions,
				newContainerClassName,
				newPosition,
				newAnimated,
				newAnimationEnterClassName,
				newAnimationLeaveClassName,
				newEnterDelay,
				newLeaveDelay,
				newOnEnter,
				newOnLeave,
				newOffset,
				newWidth,
				newDisabled
			),
		destroy: () => tooltip.destroy()
	};
};

export default useTooltip;
