import TocElement from 'components/TocElement.tsx';
import TwoRunBundle from 'components/two/TwoRunBundle.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React, { type ReactNode } from 'react';
import Badge from 'react-bootstrap/Badge';
import type { ChartConfig } from 'store/store.ts';

interface TwoRunsViewProps {
  runNames: string[];
  benchmarkBundles: BenchmarkBundle[];
  metricExtractor: MetricExtractor;
  chartConfig: ChartConfig;
}

export default class TwoRunsView extends React.Component<TwoRunsViewProps> {
  render() {
    const { runNames, benchmarkBundles, metricExtractor, chartConfig } = this.props;

    const elements: ReactNode[] = [];
    elements.push(
      <div key="summary">
        Comparing <Badge bg="secondary">{benchmarkBundles.length}</Badge> benchmark classes for &#39;
        {runNames[0]}&#39; and &#39;
        {runNames[1]}&#39; on metric &#39;
        {metricExtractor.metricKey}&#39;.
      </div>
    );

    benchmarkBundles.forEach((benchmarkBundle) => {
      elements.push(
        <TocElement key={benchmarkBundle.key} name={benchmarkBundle.key}>
          <TwoRunBundle
            runNames={runNames}
            benchmarkBundle={benchmarkBundle}
            metricExtractor={metricExtractor}
            chartConfig={chartConfig}
          />
        </TocElement>
      );
    });

    return <div>{elements}</div>;
  }
}
