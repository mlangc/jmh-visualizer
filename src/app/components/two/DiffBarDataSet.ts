import { round, shouldRound } from 'functions/util.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import { getMetricType } from 'models/MetricType.ts';

export interface DiffDataPoint {
  index: number;
  name: string;
  scoreDiff: number;
  scoreUnit: string;
  score1stRun: number;
  score2ndRun: number;
  scoreError1stRun: number;
  scoreError2ndRun: number;
}

export function createDataSetFromBenchmarks(
  benchmarkBundle: BenchmarkBundle,
  metricExtractor: MetricExtractor,
  sort: boolean
) {
  const shouldRoundScores = shouldRound(benchmarkBundle.benchmarkMethods, metricExtractor);
  const data = benchmarkBundle.benchmarkMethods
    .map((benchmarkMethod, i): DiffDataPoint | undefined => {
      const firstRunBenchmark = benchmarkMethod.benchmarks[0];
      const secondRunBenchmark = benchmarkMethod.benchmarks[1];

      if (
        firstRunBenchmark &&
        secondRunBenchmark &&
        metricExtractor.hasMetric(firstRunBenchmark) &&
        metricExtractor.hasMetric(secondRunBenchmark)
      ) {
        const scoreUnit = metricExtractor.extractScoreUnit(firstRunBenchmark);
        const metricType = getMetricType(metricExtractor.extractType(firstRunBenchmark));
        const score1stRun = round(metricExtractor.extractScore(firstRunBenchmark), shouldRoundScores);
        const score2ndRun = round(metricExtractor.extractScore(secondRunBenchmark), shouldRoundScores);
        const scoreError1stRun = round(metricExtractor.extractScoreError(firstRunBenchmark), shouldRoundScores);
        const scoreError2ndRun = round(metricExtractor.extractScoreError(secondRunBenchmark), shouldRoundScores);

        let scoreDiff: number;
        if (metricType?.increaseIsGood) {
          // i.e. for throughput decrease is an increase, its worse basically
          scoreDiff = round(((score2ndRun - score1stRun) / score1stRun) * 100, shouldRoundScores);
        } else {
          scoreDiff = round(((score1stRun - score2ndRun) / score2ndRun) * 100, shouldRoundScores);
        }

        return {
          index: i,
          name: benchmarkMethod.key,
          scoreDiff: scoreDiff,
          scoreUnit: scoreUnit,
          score1stRun: score1stRun,
          score2ndRun: score2ndRun,
          scoreError1stRun: scoreError1stRun,
          scoreError2ndRun: scoreError2ndRun
        };
      }
      return undefined;
    })
    .filter((element) => element !== undefined);

  if (sort) {
    data.sort((a, b) => b.scoreDiff - a.scoreDiff);
  }

  return {
    data: data,
    roundScores: shouldRoundScores
  };
}
