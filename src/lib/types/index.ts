export interface TooltipOptions {
  content?: string;
  contentSelector?: string;
  contentActions?: {
    [key: string]: {
      eventType: string;
      callback?: (...args: any[]) => void;
      callbackParams?: any[];
      closeOnCallback?: boolean;
    };
  };
  containerClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  animated?: boolean;
  animationEnterClassName?: string;
  animationLeaveClassName?: string;
  enterDelay?: number;
  leaveDelay?: number;
  onEnter?: () => void;
  onLeave?: () => void;
  offset?: number;
  disabled?: boolean;
}
