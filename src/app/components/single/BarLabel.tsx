import { blue } from 'functions/colors.ts';
import type { LabelProps } from 'recharts';

interface BarLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  textAnchor: LabelProps['textAnchor'];
}

// LabelList passes numbers, although its typings would allow strings too
export default function BarLabel(props: LabelProps) {
  const { x, y, width, height, value, textAnchor } = props as BarLabelProps;
  return (
    <g>
      <text
        stroke={blue}
        fontSize={11}
        textAnchor={textAnchor}
        fill="hsla(0, 100%, 100%, 0.8)"
        x={x + width + 7}
        y={y + height / 2 - 7}
        width={width}
        height={height}
        className="recharts-bar-label"
      >
        {value}
      </text>
    </g>
  );
}
