import Tooltip from './Tooltip'

import './useTooltip.css'

const useTooltip = (
	node,
	{
		content,
		contentSelector,
		contentClone,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		disabled,
	}
) => {
	const tooltip = new Tooltip(
		node,
		content,
		contentSelector,
		contentClone,
		contentActions,
		containerClassName,
		position,
		animated,
		animationEnterClassName,
		animationLeaveClassName,
		disabled
	)

	return {
		update: ({
			content: newContent,
			contentSelector: newContentSelector,
			contentClone: newContentClone,
			contentActions: newContentActions,
			containerClassName: newContainerClassName,
			position: newPosition,
			animated: newAnimated,
			animationEnterClassName: newAnimationEnterClassName,
			animationLeaveClassName: newAnimationLeaveClassName,
			disabled: newDisabled,
		}) => {
			tooltip.update(
				newContent,
				newContentSelector,
				newContentClone,
				newContentActions,
				newContainerClassName,
				newPosition,
				newAnimated,
				newAnimationEnterClassName,
				newAnimationLeaveClassName,
				newDisabled
			)
		},
		destroy: () => {
			tooltip.destroy()
		},
	}
}

export default useTooltip
