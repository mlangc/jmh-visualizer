import type { MouseEvent } from 'react';
import type { MouseHandlerDataParam } from 'recharts';
import { methodKey } from 'store/store.ts';

// Scrolls the sidebar's list so that the block of a method - its checkbox plus its nested param checkboxes - is
// centred in it, as far as the list can scroll. Only the list moves, not the page.
export default function scrollSidebarToMethod(fullyQualifiedClassName: string, methodName: string) {
  const key = methodKey(fullyQualifiedClassName, methodName);
  const block = Array.from(document.querySelectorAll<HTMLElement>('[data-method-key]')).find(
    (element) => element.dataset.methodKey === key
  );
  const list = block?.closest<HTMLElement>('.sidebar-scroll-list');
  if (!block || !list) {
    return;
  }

  const blockBox = block.getBoundingClientRect();
  const blockCentre = blockBox.top + blockBox.height / 2 - list.getBoundingClientRect().top - list.clientTop;
  list.scrollTo({ top: list.scrollTop + blockCentre - list.clientHeight / 2, behavior: 'smooth' });
}

interface Row {
  name: string;
  methodName: string;
}

// The click handlers for a horizontal bar chart, which let a click anywhere in a row - its bars, its Y-axis label or
// the space between - scroll the sidebar to the row's method
export function rowClickHandlers(fullyQualifiedClassName: string, rows: Row[]) {
  const scrollToRow = (row: Row | undefined) => {
    if (row) {
      scrollSidebarToMethod(fullyQualifiedClassName, row.methodName);
    }
  };
  return {
    onChartClick: (state: MouseHandlerDataParam) =>
      scrollToRow(state.isTooltipActive ? rows[Number(state.activeTooltipIndex)] : undefined),
    // A label lies outside of the rows, where the chart's own click handler would pick a row of its own
    onTickClick: (tick: { value: unknown }, _index: number, event: MouseEvent) => {
      event.stopPropagation();
      scrollToRow(rows.find((row) => row.name === tick.value));
    }
  };
}
