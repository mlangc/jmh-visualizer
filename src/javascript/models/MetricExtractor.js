// An abstract class defining common extractions from benchmark results for score, gc, etc..
export default class MetricExtractor {
  constructor(metricKey) {
    this.metricKey = metricKey;
  }

  getMetricObject(_benchmark) {
    throw new TypeError('Do not call abstract method foo from child.');
  }

  extractType(_benchmark) {
    throw new TypeError('Do not call abstract method foo from child.');
  }

  hasHistogram(_benchmark) {
    throw new TypeError('Do not call abstract method foo from child.');
  }

  hasMetric(benchmark) {
    return !!this.getMetricObject(benchmark);
  }

  extractScore(benchmark) {
    return this.getMetricObject(benchmark).score;
  }

  extractScoreError(benchmark) {
    return this.getMetricObject(benchmark).scoreError;
  }

  extractScoreUnit(benchmark) {
    return this.getMetricObject(benchmark).scoreUnit;
  }

  extractRawData(benchmark) {
    return this.getMetricObject(benchmark).rawData;
  }

  extractRawDataHistogram(benchmark) {
    return this.getMetricObject(benchmark).rawDataHistogram;
  }

  extractRawDataScores(_benchmark) {
    throw new TypeError('Do not call abstract method foo from child.');
  }

  extractMinMax(benchmark) {
    const score = this.extractScore(benchmark);
    let min = score;
    let max = score;
    const rawDataScores = this.extractRawDataScores(benchmark);
    rawDataScores.forEach((rawDataScore) => {
      min = Math.min(min, rawDataScore);
      max = Math.max(max, rawDataScore);
    });
    return [min, max];
  }
}
