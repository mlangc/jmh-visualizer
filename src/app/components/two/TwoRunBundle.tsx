import ChartHeader from 'components/ChartHeader.tsx';
import { DetailsButton, SortButton } from 'components/Icons.tsx';
import DiffBarChartView from 'components/two/DiffBarChartView.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React from 'react';
import Button from 'react-bootstrap/Button';
import Collapse from 'react-bootstrap/Collapse';
import type { ChartConfig } from 'store/store.ts';

interface TwoRunBundleProps {
  runNames: string[];
  benchmarkBundle: BenchmarkBundle;
  metricExtractor: MetricExtractor;
  chartConfig: ChartConfig;
}

interface TwoRunBundleState {
  sort: boolean;
  showJson1: boolean;
  showJson2: boolean;
}

// The view for a bunch of benchmarks, usually all of a benchmark class
export default class TwoRunBundle extends React.Component<TwoRunBundleProps, TwoRunBundleState> {
  constructor(props: TwoRunBundleProps) {
    super(props);
    this.state = {
      sort: props.chartConfig.sort,
      showJson1: false,
      showJson2: false
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: TwoRunBundleProps) {
    if (nextProps.chartConfig.sort !== this.state.sort) {
      this.setState({ sort: nextProps.chartConfig.sort });
    }
  }

  toggleSort() {
    this.setState({
      sort: !this.state.sort
    });
  }

  toggleShowJson1() {
    this.setState({
      showJson1: !this.state.showJson1,
      showJson2: false
    });
  }

  toggleShowJson2() {
    this.setState({
      showJson1: false,
      showJson2: !this.state.showJson2
    });
  }

  render() {
    const { runNames, benchmarkBundle, metricExtractor } = this.props;
    const { sort, showJson1, showJson2 } = this.state;

    const benchmarks1 = benchmarkBundle.benchmarksFromRun(0);
    const benchmarks2 = benchmarkBundle.benchmarksFromRun(1);
    const newBenchmarks: string[] = [];
    const removedBenchmarks: string[] = [];
    let hasSomethingToCompare = false;
    benchmarkBundle.benchmarkMethods.forEach((benchmarkMethod) => {
      if (benchmarkMethod.benchmarks[0] === null || !metricExtractor.hasMetric(benchmarkMethod.benchmarks[0])) {
        newBenchmarks.push(benchmarkMethod.name);
      } else if (benchmarkMethod.benchmarks[1] === null || !metricExtractor.hasMetric(benchmarkMethod.benchmarks[1])) {
        removedBenchmarks.push(benchmarkMethod.name);
      } else {
        hasSomethingToCompare = true;
      }
    });

    var scoresChart = hasSomethingToCompare ? (
      <DiffBarChartView
        runNames={runNames}
        benchmarkBundle={benchmarkBundle}
        metricExtractor={metricExtractor}
        sort={sort}
      />
    ) : null;

    return (
      <div>
        <ChartHeader benchmarkBundle={benchmarkBundle} metricExtractor={metricExtractor}>
          <DetailsButton key="details" benchmarkBundle={benchmarkBundle} />
          <SortButton key="sort" active={sort} action={this.toggleSort.bind(this)} />
        </ChartHeader>
        <div style={{ fontSize: '0.90em' }}>{scoresChart}</div>
        {removedBenchmarks.length > 0 && (
          <div>
            <b>Removed benchmarks:</b>
            {` ${removedBenchmarks.join(', ')}`}
            <br />
            <br />
          </div>
        )}
        {newBenchmarks.length > 0 && (
          <div>
            <b>New benchmarks:</b>
            {` ${newBenchmarks.join(', ')}`}
            <br />
            <br />
          </div>
        )}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={this.toggleShowJson1.bind(this)}
          active={this.state.showJson1}
        >
          Show JSON 1
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={this.toggleShowJson2.bind(this)}
          active={this.state.showJson2}
        >
          Show JSON 2
        </Button>
        <Collapse in={showJson1}>
          <div>
            <pre>{JSON.stringify(benchmarks1, null, '\t')}</pre>
            <Button variant="primary" onClick={this.toggleShowJson1.bind(this)}>
              Collapse
            </Button>
          </div>
        </Collapse>
        <Collapse in={showJson2}>
          <div>
            <pre>{JSON.stringify(benchmarks2, null, '\t')}</pre>
            <Button variant="primary" onClick={this.toggleShowJson2.bind(this)}>
              Collapse
            </Button>
          </div>
        </Collapse>
      </div>
    );
  }
}
