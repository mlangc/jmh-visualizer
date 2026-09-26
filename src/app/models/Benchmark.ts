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
  // JMH writes the string "NaN" when it has no error estimate; the code relies on the
  // global isNaN() coercing that (Number.isNaN() wouldn't)
  scoreError: number;
  scoreUnit: string;
  rawData?: number[][]; // [fork][iteration]
  rawDataHistogram?: [number, number][][][]; // [fork][iteration][[score, occurrences]...], sample mode only
}
