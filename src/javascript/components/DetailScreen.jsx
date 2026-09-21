import DetailSideBar from 'components/DetailSideBar.jsx';
import DetailView from 'components/DetailView.jsx';
import { ScaleButton, SortButton } from 'components/Icons.jsx';
import SplitPane from 'components/lib/SplitPane.jsx';
import LineChartView from 'components/multi/LineChartView.jsx';
import BarChartView from 'components/single/BarChartView.jsx';
import DiffBarChartView from 'components/two/DiffBarChartView.jsx';
import { filterBenchmarkBundle } from 'functions/benchmarkFilter.js';
import { parseClassNameFromFullName } from 'functions/parse.js';
import BenchmarkBundle from 'models/BenchmarkBundle.js';
import BenchmarkSelection from 'models/BenchmarkSelection.js';
import { actions, connect } from 'store/store.js';

/* eslint react/prop-types: 0 */
const DetailScreen = ({
  detailedBenchmarkBundle,
  benchmarkSelection,
  deselectedMethods,
  deselectedParamValues,
  chartConfig
}) => {
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
    }, new Set())
  );

  let error, chartGeneratorFunction;
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

  let mainView;
  if (error) {
    mainView = <div>{error}</div>;
  } else {
    mainView = (
      <DetailView
        runNames={runNames}
        benchmarkBundle={detailBundle}
        secondaryMetrics={secondaryMetrics}
        chartConfig={chartConfig}
        chartGeneratorFunction={chartGeneratorFunction}
      />
    );
  }
  const buttons = [];
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
    detailedBenchmarkBundle,
    benchmarkSelection: new BenchmarkSelection(benchmarkRuns, runSelection),
    deselectedMethods,
    deselectedParamValues,
    chartConfig
  })
)(DetailScreen);

function singleRunChartGenerator(_runNames, benchmarkBundle, metricsExtractor, chartConfig) {
  return (
    <BarChartView benchmarkBundle={benchmarkBundle} metricExtractor={metricsExtractor} chartConfig={chartConfig} />
  );
}

function twoRunsChartGenerator(runNames, benchmarkBundle, metricsExtractor, chartConfig) {
  return (
    <DiffBarChartView
      runNames={runNames}
      benchmarkBundle={benchmarkBundle}
      metricExtractor={metricsExtractor}
      sort={chartConfig.sort}
    />
  );
}

function multiRunChartGenerator(runNames, benchmarkBundle, metricsExtractor, chartConfig) {
  return (
    <LineChartView
      runNames={runNames}
      benchmarkBundle={benchmarkBundle}
      metricExtractor={metricsExtractor}
      logScale={chartConfig.logScale}
    />
  );
}
