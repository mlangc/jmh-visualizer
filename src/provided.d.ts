import type { Benchmark } from 'models/Benchmark.ts';

// The globals provided.js defines (it stays plain JS: it's meant to be replaced post-build)
declare global {
  var providedBenchmarks: string[];
  var providedBenchmarkStore: Record<string, Benchmark[]>;
}
