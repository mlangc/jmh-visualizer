import { interpolateSinebow, schemeCategory10 } from 'd3-scale-chromatic';
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

// Up to 10 lines get the familiar category colors. More lines get hues spread by the golden
// ratio instead, so each stays distinct and neighbouring lines get clearly different hues.
const lineColor = (index: number, lineCount: number) =>
  lineCount <= schemeCategory10.length ? schemeCategory10[index] : interpolateSinebow((index * 0.618034) % 1);

import scrollSidebarToMethod from 'components/lib/scrollSidebarToMethod.ts';
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
  legendContainer: HTMLDivElement | null;
}

export default class LineChartView extends React.Component<LineChartViewProps, LineChartViewState> {
  constructor(props: LineChartViewProps) {
    super(props);
    this.state = {
      activeLine: null,
      legendContainer: null
    };
  }

  shouldComponentUpdate(nextProps: LineChartViewProps, nextState: LineChartViewState) {
    return (
      this.props.runNames[0] !== nextProps.runNames[0] ||
      this.props.benchmarkBundle.fullyQualifiedClassName !== nextProps.benchmarkBundle.fullyQualifiedClassName ||
      this.props.metricExtractor.metricKey !== nextProps.metricExtractor.metricKey ||
      this.props.logScale !== nextProps.logScale ||
      this.state.activeLine !== nextState.activeLine ||
      this.state.legendContainer !== nextState.legendContainer
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

  scrollSidebarToLegendEntry(entry: Parameters<NonNullable<LegendProps['onClick']>>[0]) {
    const { benchmarkBundle } = this.props;
    const benchmarkMethod = benchmarkBundle.benchmarkMethods.find((aMethod) => aMethod.key === entry.dataKey);
    if (benchmarkMethod) {
      scrollSidebarToMethod(benchmarkBundle.fullyQualifiedClassName, benchmarkMethod.name);
    }
  }

  deactivateLine() {
    this.setState({
      activeLine: null
    });
  }

  setLegendContainer = (legendContainer: HTMLDivElement | null) => {
    if (legendContainer !== this.state.legendContainer) {
      this.setState({ legendContainer });
    }
  };

  render() {
    const { runNames, benchmarkBundle, metricExtractor, logScale } = this.props;
    const { activeLine, legendContainer } = this.state;
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

    const lineMethods = benchmarkBundle.benchmarkMethods.filter(
      (benchmarkMethod) => !logScale || isInAllRuns(runNames, benchmarkMethod)
    );
    const lines = lineMethods.map((benchmarkMethod, i) => {
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
          stroke={lineColor(i, lineMethods.length)}
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
    // The legend is portalled below the chart, so a long one doesn't eat into the chart's height
    return (
      <div className="legend-scrolls-sidebar">
        <ResponsiveContainer width="100%" height={450}>
          <LineChart data={dataSet} margin={{ top: 45, right: 0, left: 0, bottom: 27 }}>
            <XAxis dataKey="name" />
            <YAxis {...logScaleProps} tickFormatter={tickFormatter} />
            <CartesianGrid strokeDasharray="3 3" />
            <Legend
              portal={legendContainer}
              itemSorter={null}
              labelStyle={{ color: 'inherit' }}
              wrapperStyle={{ textAlign: 'center' }}
              onClick={this.scrollSidebarToLegendEntry.bind(this)}
              onMouseEnter={this.activateLineFromLegend.bind(this)}
              onMouseLeave={this.deactivateLine.bind(this)}
            />
            {tooltip}
            {lines}
          </LineChart>
        </ResponsiveContainer>
        <div ref={this.setLegendContainer} />
      </div>
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
