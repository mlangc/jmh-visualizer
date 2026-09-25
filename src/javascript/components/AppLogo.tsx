import { type AnchorHTMLAttributes, forwardRef, type MouseEvent, type MouseEventHandler } from 'react';

import { FaAlignLeft } from 'react-icons/fa';

interface AppLogoProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  onClick: MouseEventHandler<HTMLAnchorElement>;
}

// Dropdown.Toggle's `as` needs the DOM node forwarded for menu positioning.
const AppLogo = forwardRef<HTMLAnchorElement, AppLogoProps>(({ onClick, ...props }, ref) => {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick(e);
  };

  return (
    <a href="" ref={ref} onClick={handleClick} {...props}>
      <FaAlignLeft /> JMH Visualizer
    </a>
  );
});

export default AppLogo;
