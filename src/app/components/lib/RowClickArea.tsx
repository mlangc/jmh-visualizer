import scrollSidebarToMethod from 'components/lib/scrollSidebarToMethod.ts';
import type { MouseEvent } from 'react';
import { DefaultZIndexes, usePlotArea, ZIndexLayer } from 'recharts';

interface Row {
  name: string;
  methodName: string;
}

interface RowClickAreaProps {
  fullyQualifiedClassName: string;
  rows: Row[];
}

// Covers the rows of a horizontal bar chart - their bars and the space between - so that a click anywhere in a row
// scrolls the sidebar to the row's method. The rows are equally high, so where the click lands tells the row.
export default function RowClickArea({ fullyQualifiedClassName, rows }: RowClickAreaProps) {
  const plotArea = usePlotArea();
  if (!plotArea) {
    return null;
  }

  const onClick = (event: MouseEvent<SVGRectElement>) => {
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const row = rows[Math.floor(((event.clientY - top) / height) * rows.length)];
    if (row) {
      scrollSidebarToMethod(fullyQualifiedClassName, row.methodName);
    }
  };

  return (
    <ZIndexLayer zIndex={DefaultZIndexes.label + 1}>
      <rect
        x={plotArea.x}
        y={plotArea.y}
        width={plotArea.width}
        height={plotArea.height}
        fill="transparent"
        cursor="pointer"
        onClick={onClick}
      />
    </ZIndexLayer>
  );
}

// The click handler for the chart's Y-axis labels, which lie outside of the rows
export function rowLabelClickHandler(fullyQualifiedClassName: string, rows: Row[]) {
  return (tick: { value: unknown }) => {
    const row = rows.find((aRow) => aRow.name === tick.value);
    if (row) {
      scrollSidebarToMethod(fullyQualifiedClassName, row.methodName);
    }
  };
}
