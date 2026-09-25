import type { Benchmark } from 'models/Benchmark.ts';

export type Param = [name: string, value: string];

// Has the original benchmark results from all runs for a benchmark method
export default class BenchmarkMethod {
  key: string;
  name: string;
  params?: Param[] | null;
  benchmarks: (Benchmark | null)[];

  constructor(options: { name: string; params?: Param[] | null; benchmarks: (Benchmark | null)[] }) {
    this.key = createKey(options.name, options.params); // method name + params
    this.name = options.name; // method name (can occure multiple times with use of params)
    this.params = options.params; //[[key][value]...]
    this.benchmarks = options.benchmarks; // [{run1}, {run2}] original benchmark object per run
  }
}

function createKey(name: string, params?: Param[] | null) {
  let key = name;
  if (params) {
    key += ` [${params.map((param) => `${param[0]}=${param[1]}`).join(':')}]`;
  }
  return key;
}
