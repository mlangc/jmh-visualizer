import { ChartDetailHeader } from 'components/ChartHeader.tsx';
import { createMetricBadge } from 'components/commons.tsx';
import TocElement from 'components/TocElement.tsx';
import { getUniqueBenchmarkModes } from 'functions/parse.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import PrimaryMetricExtractor from 'models/extractor/PrimaryMetricExtractor.ts';
import SecondaryMetricExtractor from 'models/extractor/SecondaryMetricExtractor.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import type { ReactNode } from 'react';
import type { ChartConfig } from 'store/store.ts';

export type ChartGeneratorFunction = (
  runNames: string[],
  benchmarkBundle: BenchmarkBundle,
  metricExtractor: MetricExtractor,
  chartConfig: ChartConfig
) => ReactNode;

interface DetailViewProps {
  runNames: string[];
  benchmarkBundle: BenchmarkBundle;
  secondaryMetrics: string[];
  chartConfig: ChartConfig;
  chartGeneratorFunction: ChartGeneratorFunction;
}

const DetailView = ({
  runNames,
  benchmarkBundle,
  secondaryMetrics,
  chartConfig,
  chartGeneratorFunction
}: DetailViewProps) => {
  const primaryMetricExtractor = new PrimaryMetricExtractor();
  const benchmarkModes = getUniqueBenchmarkModes(benchmarkBundle, primaryMetricExtractor);
  const benchmarkModeBadges = benchmarkModes.map((mode) => createMetricBadge(mode));

  const scoreMetricView = (
    <TocElement name={'Score'} key={'Score'}>
      <ChartDetailHeader name={'Score'} badges={benchmarkModeBadges} />
      {chartGeneratorFunction(runNames, benchmarkBundle, primaryMetricExtractor, chartConfig)}
      <br />
      <br />
    </TocElement>
  );
  const secondaryMetricViews = secondaryMetrics.map((secondaryMetric) => {
    const metricExtractor = new SecondaryMetricExtractor(secondaryMetric);
    return (
      <TocElement name={secondaryMetric} key={secondaryMetric}>
        <ChartDetailHeader name={secondaryMetric} badges={createMetricBadge(secondaryMetric)} />
        {chartGeneratorFunction(runNames, benchmarkBundle, metricExtractor, chartConfig)}
        <br />
        <br />
      </TocElement>
    );
  });
  return (
    <div>
      <h3>
        Details of <i>{benchmarkBundle.key}</i>
      </h3>
      <br />
      {[scoreMetricView, ...secondaryMetricViews]}
    </div>
  );
};

export default DetailView;
