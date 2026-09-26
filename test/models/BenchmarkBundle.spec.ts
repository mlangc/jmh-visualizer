import { expect } from 'chai';
import type { Benchmark } from '../../src/app/models/Benchmark.ts';

import BenchmarkBundle from '../../src/app/models/BenchmarkBundle.ts';
import BenchmarkMethod from '../../src/app/models/BenchmarkMethod.ts';

describe('functions: parseBenchmarkCollections', () => {
  it('default', () => {
    const benchmarkBundle = new BenchmarkBundle({
      key: 'com.A',
      name: 'A',
      methodNames: ['bench', 'bench2', 'bench3'],
      benchmarkMethods: [
        new BenchmarkMethod({
          name: 'bench',
          benchmarks: [
            {
              benchmark: 'com.A.bench',
              primaryMetric: {
                score: 1
              }
            } as Benchmark,
            {
              benchmark: 'com.A.bench',
              primaryMetric: {
                score: 2
              }
            } as Benchmark
          ]
        }),
        new BenchmarkMethod({
          name: 'bench2',
          benchmarks: [
            {
              benchmark: 'com.A.bench2',
              primaryMetric: {
                score: 2.1
              }
            } as Benchmark,
            null
          ]
        }),
        new BenchmarkMethod({
          name: 'bench3',
          benchmarks: [
            null,
            {
              benchmark: 'com.A.bench3',
              primaryMetric: {
                score: 3.2
              }
            } as Benchmark
          ]
        })
      ]
    });

    //select all runs
    expect(benchmarkBundle.allBenchmarks()).to.have.lengthOf(4);
    expect(benchmarkBundle.allBenchmarks()).to.have.members([
      benchmarkBundle.benchmarkMethods[0].benchmarks[0],
      benchmarkBundle.benchmarkMethods[0].benchmarks[1],
      benchmarkBundle.benchmarkMethods[1].benchmarks[0],
      benchmarkBundle.benchmarkMethods[2].benchmarks[1]
    ]);

    //select first run
    expect(benchmarkBundle.benchmarksFromRun(0)).to.have.lengthOf(2);
    expect(benchmarkBundle.benchmarksFromRun(0)).to.have.members([
      benchmarkBundle.benchmarkMethods[0].benchmarks[0],
      benchmarkBundle.benchmarkMethods[1].benchmarks[0]
    ]);

    //select second run
    expect(benchmarkBundle.benchmarksFromRun(1)).to.have.lengthOf(2);
    expect(benchmarkBundle.benchmarksFromRun(1)).to.have.members([
      benchmarkBundle.benchmarkMethods[0].benchmarks[1],
      benchmarkBundle.benchmarkMethods[2].benchmarks[1]
    ]);
  });
});
