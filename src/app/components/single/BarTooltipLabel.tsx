import { blue } from 'functions/colors.ts';
import type { LabelProps } from 'recharts';

interface BarTooltipLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  textAnchor: LabelProps['textAnchor'];
}

// LabelList passes numbers, although its typings would allow strings too
export default function BarTooltipLabel(props: LabelProps) {
  const { x, y, width, height, value, textAnchor } = props as BarTooltipLabelProps;
  return (
    <g>
      <text
        stroke={blue}
        fontSize={9}
        textAnchor={textAnchor}
        fill="hsla(0, 100%, 100%, 0.8)"
        x={x}
        y={y - 7}
        width={width}
        height={height}
        className="recharts-bar-label"
      >
        {value.toLocaleString()}
      </text>
    </g>
  );
}
