import Tooltipped from 'components/lib/Tooltipped.tsx';
import type { ReactNode } from 'react';
import Badge from 'react-bootstrap/Badge';

interface BadgeWithTooltipProps {
  name: string;
  tooltip: string;
  children?: ReactNode;
}

const BadgeWithTooltip = ({ name, tooltip, children = [] }: BadgeWithTooltipProps) => {
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
