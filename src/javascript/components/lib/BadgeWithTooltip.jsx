import Tooltipped from 'components/lib/Tooltipped.jsx';
import Badge from 'react-bootstrap/Badge';

/* eslint react/prop-types: 0 */
const BadgeWithTooltip = ({ name, tooltip, children = [] }) => {
  return (
    <Tooltipped tooltip={tooltip} position="top">
      <Badge bg="secondary">
        {name}
        {children}
      </Badge>
    </Tooltipped>
  );
};

export default BadgeWithTooltip;
