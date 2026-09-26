import { parseBenchmarkBundles } from 'functions/parse.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type BenchmarkRun from 'models/BenchmarkRun.ts';

// Selection of BenchmarkRuns with parsed BenchmarkBundles
export default class BenchmarkSelection {
  benchmarkRuns: BenchmarkRun[];
  runSelection: boolean[];
  runNames: string[];
  benchmarkBundles: BenchmarkBundle[];

  //TODO do benchmarkBundles parsing globally one time for all ?
  constructor(benchmarkRuns: BenchmarkRun[], runSelection: boolean[]) {
    const selectedBenchmarkRuns = benchmarkRuns.filter((_run, pos) => runSelection[pos]);
    this.benchmarkRuns = benchmarkRuns;
    this.runSelection = runSelection;
    this.runNames = selectedBenchmarkRuns.map((run) => run.name); //[] - names of the selected Benchmark runs
    this.benchmarkBundles = parseBenchmarkBundles(selectedBenchmarkRuns); // BenchmarkBundle[] with the benchmarks from the selected runs
  }
}
