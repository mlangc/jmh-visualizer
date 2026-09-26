import type { Benchmark } from 'models/Benchmark.ts';
import MetricExtractor from 'models/MetricExtractor.ts';

export default class SecondaryMetricExtractor extends MetricExtractor {
  getMetricObject(benchmark: Benchmark) {
    return benchmark.secondaryMetrics[this.metricKey];
  }

  extractType(_benchmark: Benchmark) {
    return this.metricKey;
  }

  hasHistogram(_benchmark: Benchmark) {
    return false;
  }

  extractRawDataScores(benchmark: Benchmark) {
    return this.extractRawData(benchmark).flatMap((forkArrays) => forkArrays.map((elem) => elem));
  }
}
