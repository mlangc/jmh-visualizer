import Tooltipped from 'components/lib/Tooltipped.tsx';
import SingleRunBundle from 'components/single/SingleRunBundle.tsx';
import TocElement from 'components/TocElement.tsx';
import { getUniqueBenchmarkModesAccrossBundles } from 'functions/parse.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React, { type ReactNode } from 'react';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import type { ChartConfig } from 'store/store.ts';

interface SingleRunViewProps {
  runName: string;
  benchmarkBundles: BenchmarkBundle[];
  focusedBundles: Set<string>;
  metricExtractor: MetricExtractor;
  chartConfig: ChartConfig;
}

interface SingleRunViewState {
  axisScalesSync: boolean;
}

export default class SingleRunView extends React.Component<SingleRunViewProps, SingleRunViewState> {
  constructor(props: SingleRunViewProps) {
    super(props);
    this.state = {
      axisScalesSync: true
    };
  }

  changeScalesSync() {
    this.setState({
      axisScalesSync: !this.state.axisScalesSync
    });
  }

  render() {
    const { runName, focusedBundles, benchmarkBundles, metricExtractor, chartConfig } = this.props;
    const { axisScalesSync } = this.state;

    let synchronizeAxisScalesToggle: ReactNode;
    let dataMax: number | undefined;
    if (focusedBundles.size > 1) {
      const benchmarkModes = getUniqueBenchmarkModesAccrossBundles(benchmarkBundles, metricExtractor);
      const axisScalesSyncPossible = benchmarkModes.length === 1;
      const switchTooltip = axisScalesSyncPossible
        ? `Sync Axis Scales: ${axisScalesSync ? 'on' : 'off'}`
        : `No Axis Scale syncing possible because of multiple benchmark modes: ${benchmarkModes}!`;
      synchronizeAxisScalesToggle = (
        <div>
          <Tooltipped tooltip={switchTooltip} position="bottom">
            <Form.Check
              type="switch"
              id="scales-sync"
              checked={axisScalesSyncPossible && axisScalesSync}
              disabled={!axisScalesSyncPossible}
              onChange={this.changeScalesSync.bind(this)}
            />
          </Tooltipped>
        </div>
      );
      if (axisScalesSync && axisScalesSyncPossible) {
        dataMax = 0;
        benchmarkBundles.forEach((benchmarkBundle) => {
          benchmarkBundle.allBenchmarks().forEach((benchmark) => {
            dataMax = Math.max(dataMax!, metricExtractor.extractMinMax(benchmark)[1]);
          });
        });
      }
    }

    const elements: ReactNode[] = [];
    elements.push(
      <div key="summary" style={{ position: 'relative' }}>
        <Badge bg="secondary">{benchmarkBundles.length}</Badge>
        {` different benchmark classes for single run '${runName}' and metric '${metricExtractor.metricKey}' detected!`}
        <span style={{ position: 'absolute', right: 20 }}>{synchronizeAxisScalesToggle}</span>
      </div>
    );

    benchmarkBundles.forEach((bundle) => {
      elements.push(
        <TocElement key={bundle.key} name={bundle.key}>
          <SingleRunBundle
            benchmarkBundle={bundle}
            metricExtractor={metricExtractor}
            chartConfig={chartConfig}
            dataMax={dataMax}
          />
        </TocElement>
      );
    });

    return <div>{elements}</div>;
  }
}
