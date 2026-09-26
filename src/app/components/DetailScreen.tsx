import DetailSideBar from 'components/DetailSideBar.tsx';
import DetailView, { type ChartGeneratorFunction } from 'components/DetailView.tsx';
import { ScaleButton, SortButton } from 'components/Icons.tsx';
import SplitPane from 'components/lib/SplitPane.tsx';
import LineChartView from 'components/multi/LineChartView.tsx';
import BarChartView from 'components/single/BarChartView.tsx';
import DiffBarChartView from 'components/two/DiffBarChartView.tsx';
import { filterBenchmarkBundle } from 'functions/benchmarkFilter.ts';
import { parseClassNameFromFullName } from 'functions/parse.ts';
import BenchmarkBundle from 'models/BenchmarkBundle.ts';
import BenchmarkSelection from 'models/BenchmarkSelection.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import type { ReactElement } from 'react';
import { actions, type ChartConfig, connect, type State } from 'store/store.ts';

type DetailScreenProps = Pick<State, 'deselectedMethods' | 'deselectedParamValues' | 'chartConfig'> & {
  detailedBenchmarkBundle: string;
  benchmarkSelection: BenchmarkSelection;
};

const DetailScreen = ({
  detailedBenchmarkBundle,
  benchmarkSelection,
  deselectedMethods,
  deselectedParamValues,
  chartConfig
}: DetailScreenProps) => {
  const benchmarkBundles = benchmarkSelection.benchmarkBundles;
  const runNames = benchmarkSelection.runNames;

  const rawDetailBundle =
    benchmarkBundles.find((bundle) => bundle.key === detailedBenchmarkBundle) ||
    new BenchmarkBundle({
      key: detailedBenchmarkBundle,
      name: parseClassNameFromFullName(detailedBenchmarkBundle),
      methodNames: [],
      benchmarkMethods: []
    });
  const detailBundle =
    filterBenchmarkBundle(rawDetailBundle, deselectedMethods, deselectedParamValues) ||
    new BenchmarkBundle({
      key: rawDetailBundle.key,
      name: rawDetailBundle.name,
      methodNames: [],
      benchmarkMethods: []
    });
  const secondaryMetrics = Array.from(
    detailBundle.allBenchmarks().reduce((aggregate, benchmark) => {
      Object.keys(benchmark.secondaryMetrics).forEach((metricKey) => {
        aggregate.add(metricKey);
      });
      return aggregate;
    }, new Set<string>())
  );

  let error: string | undefined, chartGeneratorFunction: ChartGeneratorFunction | undefined;
  if (detailBundle.methodNames.length === 0) {
    error =
      rawDetailBundle.methodNames.length === 0 && runNames.length === 1
        ? `No benchmark results for run  ${runNames[0]}`
        : 'All benchmark methods are filtered out';
  } else if (runNames.length === 1) {
    chartGeneratorFunction = singleRunChartGenerator;
  } else if (runNames.length === 2) {
    chartGeneratorFunction = twoRunsChartGenerator;
  } else {
    chartGeneratorFunction = multiRunChartGenerator;
  }

  let mainView: ReactElement;
  if (error) {
    mainView = <div>{error}</div>;
  } else {
    mainView = (
      <DetailView
        runNames={runNames}
        benchmarkBundle={detailBundle}
        secondaryMetrics={secondaryMetrics}
        chartConfig={chartConfig}
        chartGeneratorFunction={chartGeneratorFunction!}
      />
    );
  }
  const buttons: ReactElement[] = [];
  if (benchmarkSelection.runNames.length === 1) {
    buttons.push(<SortButton key="sortButton" active={chartConfig.sort} action={actions.sort} />);
    buttons.push(<span key="sep1"> | </span>);
    buttons.push(<ScaleButton key="scaleButton" active={chartConfig.logScale} action={actions.logScale} />);
  } else if (benchmarkSelection.runNames.length === 2) {
    buttons.push(<SortButton key="sortButton" active={chartConfig.sort} action={actions.sort} />);
  } else {
    buttons.push(<ScaleButton key="scaleButton" active={chartConfig.logScale} action={actions.logScale} />);
  }

  return (
    <SplitPane
      left={mainView}
      right={
        <DetailSideBar
          benchmarkBundle={rawDetailBundle}
          benchmarkBundles={benchmarkBundles}
          secondaryMetrics={secondaryMetrics}
          deselectedMethods={deselectedMethods}
          deselectedParamValues={deselectedParamValues}
          buttons={buttons}
        />
      }
    />
  );
};

export default connect(
  ({
    detailedBenchmarkBundle,
    benchmarkRuns,
    runSelection,
    deselectedMethods,
    deselectedParamValues,
    chartConfig
  }) => ({
    detailedBenchmarkBundle: detailedBenchmarkBundle as string, // App only renders this screen while one is set
    benchmarkSelection: new BenchmarkSelection(benchmarkRuns, runSelection),
    deselectedMethods,
    deselectedParamValues,
    chartConfig
  })
)(DetailScreen);

function singleRunChartGenerator(
  _runNames: string[],
  benchmarkBundle: BenchmarkBundle,
  metricsExtractor: MetricExtractor,
  chartConfig: ChartConfig
) {
  return (
    <BarChartView benchmarkBundle={benchmarkBundle} metricExtractor={metricsExtractor} chartConfig={chartConfig} />
  );
}

function twoRunsChartGenerator(
  runNames: string[],
  benchmarkBundle: BenchmarkBundle,
  metricsExtractor: MetricExtractor,
  chartConfig: ChartConfig
) {
  return (
    <DiffBarChartView
      runNames={runNames}
      benchmarkBundle={benchmarkBundle}
      metricExtractor={metricsExtractor}
      sort={chartConfig.sort}
    />
  );
}

function multiRunChartGenerator(
  runNames: string[],
  benchmarkBundle: BenchmarkBundle,
  metricsExtractor: MetricExtractor,
  chartConfig: ChartConfig
) {
  return (
    <LineChartView
      runNames={runNames}
      benchmarkBundle={benchmarkBundle}
      metricExtractor={metricsExtractor}
      logScale={chartConfig.logScale}
    />
  );
}
