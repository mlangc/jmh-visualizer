import { flatten } from 'functions/util.ts';
import type { Benchmark } from 'models/Benchmark.ts';
import type BenchmarkMethod from 'models/BenchmarkMethod.ts';

// Holds a collection of benchmarks, typically those from a benchmark class
export default class BenchmarkBundle {
  /** A fully qualified class name like com.company.ClassA */
  fullyQualifiedClassName: string;

  /** A simple class name like ClassA */
  simpleClassName: string;

  /** Unique method names (the same method might appear multiple times in {@link benchmarkMethods} with different params) */
  methodNames: string[];

  /** Per method and param combination benchmark data */
  benchmarkMethods: BenchmarkMethod[];

  constructor(options: {
    fullyQualifiedClassName: string;
    simpleClassName: string;
    methodNames: string[];
    benchmarkMethods: BenchmarkMethod[];
  }) {
    this.fullyQualifiedClassName = options.fullyQualifiedClassName;
    this.simpleClassName = options.simpleClassName;
    this.methodNames = options.methodNames;
    this.benchmarkMethods = options.benchmarkMethods;
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
