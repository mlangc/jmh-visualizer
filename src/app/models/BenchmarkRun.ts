import type { Benchmark } from 'models/Benchmark.ts';

// Holds all benchmarks of a JMH run
export default class BenchmarkRun {
  name: string;
  benchmarks: Benchmark[];

  constructor(options: { name: string; benchmarks: Benchmark[] }) {
    this.name = options.name;
    this.benchmarks = options.benchmarks;
  }
}
