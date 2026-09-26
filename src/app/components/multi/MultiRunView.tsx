import MultiRunBundle from 'components/multi/MultiRunBundle.tsx';
import TocElement from 'components/TocElement.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React, { type ReactNode } from 'react';
import Badge from 'react-bootstrap/Badge';
import type { ChartConfig } from 'store/store.ts';

interface MultiRunViewProps {
  runNames: string[];
  benchmarkBundles: BenchmarkBundle[];
  metricExtractor: MetricExtractor;
  chartConfig: ChartConfig;
}

export default class MultiRunView extends React.Component<MultiRunViewProps> {
  render() {
    const { runNames, benchmarkBundles, metricExtractor, chartConfig } = this.props;

    const elements: ReactNode[] = [];
    elements.push(
      <div key="summary">
        Comparing <Badge bg="secondary">{benchmarkBundles.length}</Badge> benchmark classes for
        {` ${runNames.length}`} runs on metric &#39;
        {metricExtractor.metricKey}&#39;.
      </div>
    );

    benchmarkBundles.forEach((benchmarkBundle) => {
      elements.push(
        <TocElement key={benchmarkBundle.key} name={benchmarkBundle.key}>
          <MultiRunBundle
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
