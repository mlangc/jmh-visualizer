import SummaryHeader from 'components/summary/SummaryHeader.tsx';
import SummaryTable from 'components/summary/SummaryTable.tsx';
import { flatten, round, shouldRound } from 'functions/util.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type BenchmarkMethod from 'models/BenchmarkMethod.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import { getMetricType } from 'models/MetricType.ts';
import React from 'react';

// How one benchmark method changed between the two compared runs
export interface BenchmarkDiff {
  bundleKey: string;
  bundleName: string;
  benchmarkMethod: BenchmarkMethod;
  score1stRun: number;
  score2ndRun: number;
  scoreError1stRun: number;
  scoreError2ndRun: number;
  scoreUnit: string;
  scoreDiff: number;
  scoreErrorDiff: number;
}

interface SummaryViewProps {
  runNames: string[];
  benchmarkBundles: BenchmarkBundle[];
  runIndex: [number, number];
  minDeviation: number;
  metricExtractor: MetricExtractor;
}

interface SummaryViewState {
  minDeviation: number;
}

export default class SummaryView extends React.Component<SummaryViewProps, SummaryViewState> {
  constructor(props: SummaryViewProps) {
    super(props);
    this.state = {
      minDeviation: this.props.minDeviation
    };
  }

  changeMinDeviation(number: number) {
    if (number !== this.state.minDeviation) {
      this.setState({
        minDeviation: number
      });
    }
  }

  render() {
    const { runNames, runIndex, benchmarkBundles, metricExtractor } = this.props;
    const { minDeviation } = this.state;

    const benchmarkDiffs = flatten(
      benchmarkBundles.map((benchmarkBundle) =>
        benchmarkBundle.benchmarkMethods
          .map((benchmarkMethod): BenchmarkDiff | undefined => {
            const shouldRoundScores = shouldRound(benchmarkBundle.benchmarkMethods, metricExtractor);
            const firstRunBenchmark = benchmarkMethod.benchmarks[runIndex[0]];
            const secondRunBenchmark = benchmarkMethod.benchmarks[runIndex[1]];

            if (
              firstRunBenchmark &&
              secondRunBenchmark &&
              metricExtractor.hasMetric(firstRunBenchmark) &&
              metricExtractor.hasMetric(secondRunBenchmark)
            ) {
              const metricType = getMetricType(metricExtractor.extractType(firstRunBenchmark));
              const score1stRun = round(metricExtractor.extractScore(firstRunBenchmark), shouldRoundScores);
              const score2ndRun = round(metricExtractor.extractScore(secondRunBenchmark), shouldRoundScores);
              const scoreError1stRun = round(metricExtractor.extractScoreError(firstRunBenchmark), shouldRoundScores);
              const scoreError2ndRun = round(metricExtractor.extractScoreError(secondRunBenchmark), shouldRoundScores);
              const scoreUnit = metricExtractor.extractScoreUnit(firstRunBenchmark);

              let scoreDiff: number;
              if (metricType?.increaseIsGood) {
                // i.e. for throughput decrease is an increase, its worse basically
                scoreDiff = round(((score2ndRun - score1stRun) / score1stRun) * 100, shouldRoundScores);
              } else {
                scoreDiff = round(((score1stRun - score2ndRun) / score2ndRun) * 100, shouldRoundScores);
              }
              const scoreErrorDiff = round(
                ((scoreError1stRun - scoreError2ndRun) / scoreError2ndRun) * 100,
                shouldRoundScores
              );

              return {
                bundleKey: benchmarkBundle.key,
                bundleName: benchmarkBundle.name,
                benchmarkMethod: benchmarkMethod,
                score1stRun: score1stRun,
                score2ndRun: score2ndRun,
                scoreError1stRun: scoreError1stRun,
                scoreError2ndRun: scoreError2ndRun,
                scoreUnit: scoreUnit,
                scoreDiff: scoreDiff,
                scoreErrorDiff: scoreErrorDiff
              };
            }
            return undefined;
          })
          .filter((element) => element !== undefined)
      )
    );

    const improvedBenchmarkDiffs = benchmarkDiffs
      .filter((element) => element.scoreDiff !== 0 && element.scoreDiff >= minDeviation)
      .sort((a, b) => b.scoreDiff - a.scoreDiff);
    const declinedBenchmarkDiffs = benchmarkDiffs
      .filter((element) => element.scoreDiff !== 0 && element.scoreDiff <= -minDeviation)
      .sort((a, b) => a.scoreDiff - b.scoreDiff);
    const unchangedBenchmarkDiffs = benchmarkDiffs
      .filter(
        (element) => element.scoreDiff === 0 || (element.scoreDiff < minDeviation && element.scoreDiff > -minDeviation)
      )
      .sort((a, b) => b.scoreDiff - a.scoreDiff);

    return (
      <div>
        <SummaryHeader
          benchmarkDiffs={benchmarkDiffs}
          minDeviation={minDeviation}
          runName1={runNames[runIndex[0]]}
          runName2={runNames[runIndex[1]]}
          metricKey={metricExtractor.metricKey}
          numberOfBenchmarkBundles={benchmarkBundles.length}
          changeMinDeviationFunction={this.changeMinDeviation.bind(this)}
        />
        <hr />
        <SummaryTable name="Improved Benchmarks" benchmarkDiffs={improvedBenchmarkDiffs} lastRunIndex={runIndex[1]} />
        <SummaryTable name="Declined Benchmarks" benchmarkDiffs={declinedBenchmarkDiffs} lastRunIndex={runIndex[1]} />
        <SummaryTable name="Unchanged Benchmarks" benchmarkDiffs={unchangedBenchmarkDiffs} lastRunIndex={runIndex[1]} />
      </div>
    );
  }
}
