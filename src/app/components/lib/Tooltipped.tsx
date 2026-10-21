import type { MouseEvent, ReactNode } from 'react';
import '../../../css/tooltip.css';

interface TooltippedProps {
  tooltip?: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  disabled?: boolean;
  children: ReactNode;
}

// Wraps a componen and puts a simple text hover tooltip to it. Parameters are:
//   tooltip='Hello World'
//   position=[left|right|bottom|top]
//   (disabled=true)
// Anchors the tooltip to the viewport, for where its position can't be relative to the wrapped component (see
// sidenavi.css)
const anchorTooltip = (event: MouseEvent<HTMLElement>) => {
  const { left, top, height } = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--tooltip-anchor-left', `${left}px`);
  event.currentTarget.style.setProperty('--tooltip-anchor-middle', `${top + height / 2}px`);
};

export default function Tooltipped(options: TooltippedProps) {
  if (options.disabled) {
    return options.children;
  }

  return (
    <span
      className={`tooltip-${options.position}`}
      data-tooltip={options.tooltip}
      data-tooltip-position={options.position}
      onMouseEnter={anchorTooltip}
    >
      {options.children}
    </span>
  );
}
