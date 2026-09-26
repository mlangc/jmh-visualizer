import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import type BenchmarkMethod from 'models/BenchmarkMethod.ts';
import React, { type ReactElement } from 'react';
import {
  CartesianGrid,
  ErrorBar,
  LabelList,
  type LabelProps,
  Legend,
  type LegendProps,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const lineColors = scaleOrdinal(schemeCategory10).range();

import MultiRunChartTooltip from 'components/multi/MultiRunChartTooltip.tsx';
import { tickFormatter } from 'functions/charts.ts';
import { tooltipBackground } from 'functions/colors.ts';
import { formatNumber, round, shouldRound } from 'functions/util.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';

interface LineChartViewProps {
  runNames: string[];
  benchmarkBundle: BenchmarkBundle;
  metricExtractor: MetricExtractor;
  logScale: boolean;
}

interface LineChartViewState {
  activeLine: string | null;
}

export default class LineChartView extends React.Component<LineChartViewProps, LineChartViewState> {
  constructor(props: LineChartViewProps) {
    super(props);
    this.state = {
      activeLine: null
    };
  }

  shouldComponentUpdate(nextProps: LineChartViewProps, nextState: LineChartViewState) {
    return (
      this.props.runNames[0] !== nextProps.runNames[0] ||
      this.props.benchmarkBundle.key !== nextProps.benchmarkBundle.key ||
      this.props.metricExtractor.metricKey !== nextProps.metricExtractor.metricKey ||
      this.props.logScale !== nextProps.logScale ||
      this.state.activeLine !== nextState.activeLine
    );
  }

  activateLineFromLegend(params: Parameters<NonNullable<LegendProps['onMouseEnter']>>[0]) {
    this.activateLine(params.dataKey as string);
  }

  activateLine(benchmarkMethodKey: string) {
    this.setState({
      activeLine: benchmarkMethodKey
    });
  }

  deactivateLine() {
    this.setState({
      activeLine: null
    });
  }

  render() {
    const { runNames, benchmarkBundle, metricExtractor, logScale } = this.props;
    const { activeLine } = this.state;
    const shouldRoundScores = shouldRound(benchmarkBundle.benchmarkMethods, metricExtractor);

    // Omitted rather than undefined for linear: recharts merges its own defaultProps under
    // the given props, so an explicit undefined would override them.
    const logScaleProps = logScale ? { scale: 'log' as const, domain: ['auto', 'auto'] } : {};

    const dataSet = runNames.map((runName, runIndex) => {
      const runObject: Record<string, unknown> = {
        name: runName
      };
      benchmarkBundle.benchmarkMethods.forEach((benchmarkMethod) => {
        const benchmark = benchmarkMethod.benchmarks[runIndex];
        if (benchmark && metricExtractor.hasMetric(benchmark)) {
          const score = round(metricExtractor.extractScore(benchmark), shouldRoundScores);
          const scoreError = round(metricExtractor.extractScoreError(benchmark), shouldRoundScores);
          const minMax = metricExtractor.extractMinMax(benchmark).map((minOrMax) => round(minOrMax, shouldRoundScores));
          const scoreUnit = metricExtractor.extractScoreUnit(benchmark);
          let errorBarInterval: number | number[] = 0;
          if (!isNaN(scoreError)) {
            errorBarInterval = [score - minMax[0], minMax[1] - score];
          }
          runObject[benchmarkMethod.key] = score;
          runObject.scoreUnit = scoreUnit;
          runObject[`${benchmarkMethod.key}-scoreError`] = scoreError;
          runObject[`${benchmarkMethod.key}-minMax`] = minMax;
          runObject[`${benchmarkMethod.key}-errorBarInterval`] = errorBarInterval;
          runObject[`${benchmarkMethod.key}-label`] = `${score.toLocaleString()} ${scoreUnit}`;
          runObject[`${benchmarkMethod.key}-errorLabel`] = `${scoreError.toLocaleString()} ${scoreUnit}`;
        }
      });
      return runObject;
    });

    const lines = benchmarkBundle.benchmarkMethods
      .filter((benchmarkMethod) => !logScale || isInAllRuns(runNames, benchmarkMethod))
      .map((benchmarkMethod, i) => {
        const isActive = activeLine === benchmarkMethod.key;
        const strokeWidth = isActive ? 7 : 3;
        const strokeOpacity = !activeLine || isActive ? 1 : 0.1;
        let label: ReactElement | undefined, errorBarStrokeWIdth: number;
        if (isActive) {
          label = (
            <LabelList
              dataKey={`${benchmarkMethod.key}-label`}
              content={<Label runCount={runNames.length} shouldRoundScores={shouldRoundScores} />}
            />
          );
          errorBarStrokeWIdth = 1;
        } else {
          errorBarStrokeWIdth = 0;
        }
        const errorBar = (
          <ErrorBar dataKey={`${benchmarkMethod.key}-errorBarInterval`} width={4} strokeWidth={errorBarStrokeWIdth} />
        );

        return (
          <Line
            key={benchmarkMethod.key}
            type="monotoneX"
            dataKey={benchmarkMethod.key}
            stroke={lineColors[i]}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            onMouseEnter={this.activateLine.bind(this, benchmarkMethod.key)}
            onMouseLeave={this.deactivateLine.bind(this)}
            isAnimationActive={true}
            animationDuration={540}
          >
            {label}
            {errorBar}
          </Line>
        );
      });

    const tooltip = activeLine ? undefined : (
      <Tooltip
        content={<MultiRunChartTooltip roundScores={shouldRoundScores} />}
        wrapperStyle={{ backgroundColor: tooltipBackground, opacity: 0.95 }}
      />
    );
    return (
      <ResponsiveContainer width="100%" height={450}>
        <LineChart data={dataSet} margin={{ top: 45, right: 0, left: 0, bottom: 27 }}>
          <XAxis dataKey="name" />
          <YAxis {...logScaleProps} tickFormatter={tickFormatter} />
          <CartesianGrid strokeDasharray="3 3" />
          <Legend onMouseEnter={this.activateLineFromLegend.bind(this)} onMouseLeave={this.deactivateLine.bind(this)} />
          {tooltip}
          {lines}
        </LineChart>
      </ResponsiveContainer>
    );
  }
}

function isInAllRuns(runNames: string[], benchmarkMethod: BenchmarkMethod) {
  for (let index = 0; index < runNames.length; index++) {
    if (!benchmarkMethod.benchmarks[index]) {
      return false;
    }
  }
  return true;
}

// LabelList passes x and y as numbers, although its typings would allow strings too
function Label(params: LabelProps & { runCount: number; shouldRoundScores: boolean }) {
  if (!params.value) {
    return null;
  }
  let textAnchor: 'start' | 'end' | 'middle';
  if (params.index === 0) {
    textAnchor = 'start';
  } else if (params.index === params.runCount - 1) {
    textAnchor = 'end';
  } else {
    textAnchor = 'middle';
  }
  const value = params.value && params.value.constructor === Array ? params.value[1] : params.value;
  return (
    <text
      key={params.index}
      x={params.x}
      y={(params.y as number) - 20}
      width={params.width}
      height={params.height}
      textAnchor={textAnchor}
      fontSize="11"
      stroke={params.stroke}
    >
      {formatNumber(value as number, params.shouldRoundScores)}
    </text>
  );
}
