import type { Benchmark, Metric } from 'models/Benchmark.ts';

// An abstract class defining common extractions from benchmark results for score, gc, etc..
export default abstract class MetricExtractor {
  metricKey: string;

  constructor(metricKey: string) {
    this.metricKey = metricKey;
  }

  abstract getMetricObject(benchmark: Benchmark): Metric | undefined;

  abstract extractType(benchmark: Benchmark): string;

  abstract hasHistogram(benchmark: Benchmark): boolean;

  hasMetric(benchmark: Benchmark): boolean {
    return !!this.getMetricObject(benchmark);
  }

  extractScore(benchmark: Benchmark): number {
    return this.getMetricObject(benchmark)!.score;
  }

  extractScoreError(benchmark: Benchmark): number {
    return this.getMetricObject(benchmark)!.scoreError;
  }

  extractScoreUnit(benchmark: Benchmark): string {
    return this.getMetricObject(benchmark)!.scoreUnit;
  }

  extractRawData(benchmark: Benchmark): number[][] {
    return this.getMetricObject(benchmark)!.rawData!;
  }

  extractRawDataHistogram(benchmark: Benchmark): [number, number][][][] {
    return this.getMetricObject(benchmark)!.rawDataHistogram!;
  }

  abstract extractRawDataScores(benchmark: Benchmark): number[];

  extractMinMax(benchmark: Benchmark): [number, number] {
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
