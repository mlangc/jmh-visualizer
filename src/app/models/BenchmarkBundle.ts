import { flatten } from 'functions/util.ts';
import type { Benchmark } from 'models/Benchmark.ts';
import type BenchmarkMethod from 'models/BenchmarkMethod.ts';

// Holds a collection of benchmarks, typically those from a benchmark class
export default class BenchmarkBundle {
  key: string;
  name: string;
  methodNames: string[];
  benchmarkMethods: BenchmarkMethod[];

  constructor(options: { key: string; name: string; methodNames: string[]; benchmarkMethods: BenchmarkMethod[] }) {
    this.key = options.key; // com.company.ClassA
    this.name = options.name; //ClassA
    this.methodNames = options.methodNames; //unique method names (can occur multiple times because of params)
    this.benchmarkMethods = options.benchmarkMethods; //BenchmarkMethod(name, benchmarks[])[]
  }

  //Returns all non-null benchmarks for all runs
  allBenchmarks(): Benchmark[] {
    return flatten(
      this.benchmarkMethods.map((method) =>
        method.benchmarks.filter((benchmark): benchmark is Benchmark => !!benchmark)
      )
    );
  }

  //Returns all non-null benchmarks for a given runs
  benchmarksFromRun(runIndex: number): Benchmark[] {
    return flatten(
      this.benchmarkMethods
        .map((method) => method.benchmarks[runIndex])
        .filter((benchmark): benchmark is Benchmark => !!benchmark)
    );
  }
}
