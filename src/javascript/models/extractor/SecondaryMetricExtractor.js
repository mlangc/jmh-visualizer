import MetricExtractor from 'models/MetricExtractor.js';

export default class SecondaryMetricExtractor extends MetricExtractor {
  getMetricObject(benchmark) {
    return benchmark.secondaryMetrics[this.metricKey];
  }

  extractType(_benchmark) {
    return this.metricKey;
  }

  hasHistogram(_benchmark) {
    return false;
  }

  extractRawDataScores(benchmark) {
    return this.extractRawData(benchmark).flatMap((forkArrays) => forkArrays.map((elem) => elem));
  }
}
