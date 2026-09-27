import type { BenchmarkDiff } from 'components/summary/SummaryView.tsx';
import { blue, green, red, yellow } from 'functions/colors.ts';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Surface,
  Symbols,
  Tooltip,
  type TooltipPayloadEntry,
  type TooltipValueType,
  XAxis,
  YAxis
} from 'recharts';

interface SummaryHistogramChartProps {
  benchmarkDiffs: BenchmarkDiff[];
}

interface SummaryHistogramChartState {
  disabledLabels: string[];
}

interface HistogramDataPoint {
  idx: number;
  name: string;
  scoreDiff: number;
  errorDiff: number;
  score1stRun: number;
  score2ndRun: number;
  scoreError1stRun: number;
  scoreError2ndRun: number;
  scoreUnit: string;
}

interface HistogramDataSet {
  dataKey: 'scoreDiff' | 'errorDiff';
  color: string;
}

// recharts' Legend lists only the rendered Bars, so it's fed these instead, keeping disabled ones toggleable
const dataSets: HistogramDataSet[] = [
  { dataKey: 'scoreDiff', color: green },
  { dataKey: 'errorDiff', color: blue }
];

class SummaryHistogramChart extends React.Component<SummaryHistogramChartProps, SummaryHistogramChartState> {
  constructor(props: SummaryHistogramChartProps) {
    super(props);
    this.state = {
      disabledLabels: ['errorDiff']
    };
  }

  switchLabelActivation(dataKey: string) {
    if (this.state.disabledLabels.includes(dataKey)) {
      this.setState({
        disabledLabels: this.state.disabledLabels.filter((obj) => obj !== dataKey)
      });
    } else {
      this.setState({ disabledLabels: this.state.disabledLabels.concat(dataKey) });
    }
  }

  render() {
    const { benchmarkDiffs } = this.props;
    const { disabledLabels } = this.state;

    const data = benchmarkDiffs.map(
      (benchmarkDiff, i): HistogramDataPoint => ({
        idx: i,
        name: `${benchmarkDiff.bundleName}#${benchmarkDiff.benchmarkMethod.name}(${benchmarkDiff.benchmarkMethod.params ? benchmarkDiff.benchmarkMethod.params.map((param) => `${param[0]}=${param[1]}`).join(':') : ''})`,
        scoreDiff: Math.max(-100, Math.min(100, benchmarkDiff.scoreDiff)),
        errorDiff: Math.max(-100, Math.min(100, benchmarkDiff.scoreErrorDiff)),
        score1stRun: benchmarkDiff.score1stRun,
        score2ndRun: benchmarkDiff.score2ndRun,
        scoreError1stRun: benchmarkDiff.scoreError1stRun,
        scoreError2ndRun: benchmarkDiff.scoreError2ndRun,
        scoreUnit: benchmarkDiff.scoreUnit
      })
    );

    return (
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }} barGap={0} barCategoryGap="9%">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="idx" />
          <YAxis />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ lineHeight: '40px' }}
            content={this.renderCusomizedLegend.bind(this)}
          />
          <Tooltip
            offset={10}
            position={{ x: 90, y: 144 }}
            labelFormatter={(idx) => (data[idx as number] ? data[idx as number].name : 'N/A')}
            formatter={tooltipFormat}
          />
          <ReferenceLine y={0} stroke="#000" />
          {dataSets
            .filter((elem) => !disabledLabels.includes(elem.dataKey))
            .map((activeElem) => (
              <Bar key={activeElem.dataKey} dataKey={activeElem.dataKey}>
                {data.map((entry) => (
                  <Cell key={entry.idx} fill={this.barColor(activeElem.dataKey, entry)} />
                ))}
              </Bar>
            ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  barColor(dataKey: string, dataEntry: HistogramDataPoint) {
    if (dataKey === 'scoreDiff') {
      if (dataEntry.scoreDiff > 0) {
        return green;
      } else {
        return red;
      }
    } else {
      if (dataEntry.errorDiff > 0) {
        return blue;
      } else {
        return yellow;
      }
    }
  }

  renderCusomizedLegend() {
    return (
      <div style={{ textAlign: 'center' }}>
        {dataSets.map(({ dataKey, color }) => {
          const active = this.state.disabledLabels.includes(dataKey);
          const style = {
            marginRight: 10,
            color: active ? '#AAA' : '#000'
          };

          return (
            <span
              key={dataKey}
              className="legend-item"
              onClick={() => this.switchLabelActivation(dataKey)}
              style={style}
            >
              <Surface width={15} height={15} viewBox={{ x: 0, y: 0, width: 10, height: 15 }}>
                <Symbols cx={5} cy={11} type="square" size={50} fill={color} />
                {active && <Symbols cx={5} cy={11} type="square" size={25} fill={'#FFF'} />}
              </Surface>
              <span>{dataKey}</span>
            </span>
          );
        })}
      </div>
    );
  }
}

export default SummaryHistogramChart;

function tooltipFormat(
  value: TooltipValueType | undefined,
  name: string | number | undefined,
  item: TooltipPayloadEntry
) {
  const payload: HistogramDataPoint = item.payload;
  const valueString = value != null ? value : 'N/A';
  let rawValueString: string;
  if (name === 'scoreDiff') {
    rawValueString = `${payload.score1stRun.toLocaleString()} | ${payload.score2ndRun.toLocaleString()} ${payload.scoreUnit}`;
  } else {
    rawValueString = `${payload.scoreError1stRun.toLocaleString()} | ${payload.scoreError2ndRun.toLocaleString()}`;
  }
  return `${valueString}% (${rawValueString})`;
}
