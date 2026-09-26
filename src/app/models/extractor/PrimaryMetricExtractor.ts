import type { Benchmark } from 'models/Benchmark.ts';
import MetricExtractor from 'models/MetricExtractor.ts';

export default class ScoreExtractor extends MetricExtractor {
  constructor() {
    super('Score');
  }

  getMetricObject(benchmark: Benchmark) {
    return benchmark.primaryMetric;
  }

  extractType(benchmark: Benchmark) {
    return benchmark.mode;
  }

  hasHistogram(benchmark: Benchmark) {
    return benchmark.mode === 'sample';
  }

  extractRawDataScores(benchmark: Benchmark) {
    if (this.hasHistogram(benchmark)) {
      return this.extractRawDataHistogram(benchmark).flatMap((forkArrays) =>
        forkArrays.flatMap((scoresArray) => scoresArray.map((timeOccurence) => timeOccurence[0]))
      );
    }
    return this.extractRawData(benchmark).flatMap((forkArrays) => forkArrays.map((elem) => elem));
  }
}
