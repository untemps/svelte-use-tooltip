import Tooltip from './Tooltip'

import './useTooltip.css'

const useTooltip = (
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
		offset,
		disabled,
	}
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
		offset,
		disabled
	)

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
			offset: newOffset,
			disabled: newDisabled,
		}) =>
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
				newOffset,
				newDisabled
			),
		destroy: () => tooltip.destroy(),
	}
}

export default useTooltip
