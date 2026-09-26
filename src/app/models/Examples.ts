import type BenchmarkRun from 'models/BenchmarkRun.ts';

// Holds pre-defined examples
export default class Examples {
  singleRunExample: BenchmarkRun[];
  twoRunsExample: BenchmarkRun[];
  multiRunExample: BenchmarkRun[];

  constructor(options: { run1: BenchmarkRun; run2: BenchmarkRun; run3: BenchmarkRun }) {
    this.singleRunExample = [options.run1];
    this.twoRunsExample = [options.run1, options.run2];
    this.multiRunExample = [options.run1, options.run2, options.run3];
  }
}
