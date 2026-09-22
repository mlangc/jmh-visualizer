import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import { FaAlignLeft } from 'react-icons/fa';

// Dropdown.Toggle's `as` needs the DOM node forwarded for menu positioning.
const AppLogo = forwardRef(({ onClick, ...props }, ref) => {
  const handleClick = (e) => {
    e.preventDefault();
    onClick(e);
  };

  return (
    <a href="" ref={ref} onClick={handleClick} {...props}>
      <FaAlignLeft /> JMH Visualizer
    </a>
  );
});

AppLogo.propTypes = {
  onClick: PropTypes.func
};

export default AppLogo;
