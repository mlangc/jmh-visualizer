import ChartHeader from 'components/ChartHeader.tsx';
import { DetailsButton, ScaleButton } from 'components/Icons.tsx';
import LineChartView from 'components/multi/LineChartView.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React from 'react';
import type { ChartConfig } from 'store/store.ts';

interface MultiRunBundleProps {
  runNames: string[];
  benchmarkBundle: BenchmarkBundle;
  metricExtractor: MetricExtractor;
  chartConfig: ChartConfig;
}

interface MultiRunBundleState {
  logScale: boolean;
}

// The view for a bunch of benchmarks, usually all of a benchmark class
export default class MultiRunBundle extends React.Component<MultiRunBundleProps, MultiRunBundleState> {
  constructor(props: MultiRunBundleProps) {
    super(props);
    this.state = {
      logScale: props.chartConfig.logScale
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: MultiRunBundleProps) {
    if (nextProps.chartConfig.logScale !== this.state.logScale) {
      this.setState({ logScale: nextProps.chartConfig.logScale });
    }
  }

  toggleLogScale() {
    this.setState({
      logScale: !this.state.logScale
    });
  }

  render() {
    const { runNames, benchmarkBundle, metricExtractor } = this.props;
    const { logScale } = this.state;

    return (
      <div>
        <ChartHeader benchmarkBundle={benchmarkBundle} metricExtractor={metricExtractor}>
          <DetailsButton key="details" benchmarkBundle={benchmarkBundle} />
          <ScaleButton key="scale" active={logScale} action={this.toggleLogScale.bind(this)} />
        </ChartHeader>
        <div style={{ fontSize: '0.90em' }}>
          <LineChartView
            runNames={runNames}
            benchmarkBundle={benchmarkBundle}
            metricExtractor={metricExtractor}
            logScale={logScale}
          />
        </div>
      </div>
    );
  }
}
