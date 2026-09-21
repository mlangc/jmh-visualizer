import MetricExtractor from 'models/MetricExtractor.js';

export default class SecondaryMetricExtractor extends MetricExtractor {
  getMetricObject(benchmark) {
    return benchmark.secondaryMetrics[this.metricKey];
  }

  extractType(_benchmark) {
    // eslint-disable-line no-unused-vars
    return this.metricKey;
  }

  hasHistogram(_benchmark) {
    // eslint-disable-line no-unused-vars
    return false;
  }

  extractRawDataScores(benchmark) {
    return this.extractRawData(benchmark).flatMap((forkArrays) => forkArrays.map((elem) => elem));
  }
}
