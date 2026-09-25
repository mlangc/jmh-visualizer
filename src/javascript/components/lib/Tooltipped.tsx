import type { ReactNode } from 'react';
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
export default function Tooltipped(options: TooltippedProps) {
  if (options.disabled) {
    return options.children;
  }

  return (
    <span
      className={`tooltip-${options.position}`}
      data-tooltip={options.tooltip}
      data-tooltip-position={options.position}
    >
      {options.children}
    </span>
  );
}
