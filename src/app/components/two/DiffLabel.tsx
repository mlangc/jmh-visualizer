import { yellow } from 'functions/colors.ts';
import type { LabelProps } from 'recharts';

interface DiffLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  textAnchor: LabelProps['textAnchor'];
}

// LabelList passes numbers, although its typings would allow strings too
export default function DiffLabel(props: LabelProps) {
  const { x, y, width, height, value, textAnchor } = props as DiffLabelProps;
  const xPosShift = value > 0 ? 6 : -(value.toString().length * 7);
  const xPos = x + width + xPosShift;
  return (
    <g>
      <text
        stroke={yellow}
        fontSize={12}
        textAnchor={textAnchor}
        fill="hsla(0, 100%, 100%, 0.8)"
        x={xPos}
        y={y + height / 2 + 4}
        width={width}
        height={height}
        className="recharts-bar-label"
      >
        {value}
      </text>
    </g>
  );
}
