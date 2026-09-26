import SplitPane from 'components/lib/SplitPane.tsx';
import RunSideBar from 'components/RunSideBar.tsx';
import SummaryView from 'components/summary/SummaryView.tsx';

import BenchmarkSelection from 'models/BenchmarkSelection.ts';
import PrimaryMetricExtractor from 'models/extractor/PrimaryMetricExtractor.ts';
import SecondaryMetricExtractor from 'models/extractor/SecondaryMetricExtractor.ts';
import { connect, type State } from 'store/store.ts';

type SummaryScreenProps = Pick<State, 'selectedMetric'> & {
  benchmarkSelection: BenchmarkSelection;
};

const SummaryScreen = ({ benchmarkSelection, selectedMetric }: SummaryScreenProps) => {
  const benchmarkBundles = benchmarkSelection.benchmarkBundles;
  const metricType = selectedMetric;
  const metricExtractor = createMetricExtractor(selectedMetric);
  const categories = ['Benchmarks'];
  const activeCategory = 'Benchmarks';

  const filteredBenchmarkBundles =
    metricType === 'Score'
      ? benchmarkBundles
      : benchmarkBundles.filter((benchmarkBundle) =>
          benchmarkBundle.allBenchmarks().find((benchmark) => metricExtractor.hasMetric(benchmark))
        );
  const metricsSet = new Set(['Score']);
  filteredBenchmarkBundles.forEach((benchmarkBundle) => {
    benchmarkBundle.allBenchmarks().forEach((benchmark) => {
      Object.keys(benchmark.secondaryMetrics).forEach((metricKey) => {
        metricsSet.add(metricKey);
      });
    });
  });
  const metrics = Array.from(metricsSet);

  const runIndices: [number, number] = [benchmarkSelection.runNames.length - 2, benchmarkSelection.runNames.length - 1];

  return (
    <SplitPane
      left={
        <SummaryView
          runIndex={runIndices}
          runNames={benchmarkSelection.runNames}
          minDeviation={5}
          benchmarkBundles={filteredBenchmarkBundles}
          metricExtractor={metricExtractor}
        />
      }
      right={
        <RunSideBar
          benchmarkBundles={[]}
          metrics={metrics}
          metricExtractor={metricExtractor}
          focusedBenchmarkBundles={new Set()}
          deselectedMethods={new Set()}
          deselectedParamValues={new Set()}
          categories={categories}
          activeCategory={activeCategory}
        />
      }
    />
  );
};

export default connect(({ benchmarkRuns, runSelection, selectedMetric }) => ({
  benchmarkSelection: new BenchmarkSelection(benchmarkRuns, runSelection),
  selectedMetric
}))(SummaryScreen);

function createMetricExtractor(metricType: string) {
  return metricType === 'Score' ? new PrimaryMetricExtractor() : new SecondaryMetricExtractor(metricType);
}
