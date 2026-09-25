// One entry of a JMH JSON result file (only the parts this app reads)
export interface Benchmark {
  benchmark: string; // com.company.ClassA.method
  mode: string; // thrpt, avgt, sample, ss
  params?: Record<string, string>;
  primaryMetric: Metric;
  secondaryMetrics: Record<string, Metric>;
}

export interface Metric {
  score: number;
  scoreError: number;
  scoreUnit: string;
  rawData?: number[][]; // [fork][iteration]
  rawDataHistogram?: [number, number][][][]; // [fork][iteration][[score, occurrences]...], sample mode only
}
