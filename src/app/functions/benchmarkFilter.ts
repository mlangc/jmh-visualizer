import BenchmarkBundle from 'models/BenchmarkBundle.ts';
import { isMethodInstanceDeselected, methodKey } from 'store/store.ts';

// Returns a new BenchmarkBundle with deselected methods/param-values removed,
// or null if nothing survives the filter.
export function filterBenchmarkBundle(
  benchmarkBundle: BenchmarkBundle,
  deselectedMethods: Set<string>,
  deselectedParamValues: Set<string>
) {
  let filtered = benchmarkBundle;

  if (deselectedMethods.size > 0) {
    const deselectedNames = filtered.methodNames.filter((methodName) =>
      deselectedMethods.has(methodKey(filtered.key, methodName))
    );
    if (deselectedNames.length > 0) {
      filtered = new BenchmarkBundle({
        key: filtered.key,
        name: filtered.name,
        methodNames: filtered.methodNames.filter((methodName) => !deselectedNames.includes(methodName)),
        benchmarkMethods: filtered.benchmarkMethods.filter(
          (benchmarkMethod) => !deselectedNames.includes(benchmarkMethod.name)
        )
      });
    }
  }

  if (deselectedParamValues.size > 0) {
    const survivingMethods = filtered.benchmarkMethods.filter(
      (benchmarkMethod) => !isMethodInstanceDeselected(filtered.key, benchmarkMethod, deselectedParamValues)
    );
    if (survivingMethods.length !== filtered.benchmarkMethods.length) {
      const survivingNames = new Set(survivingMethods.map((benchmarkMethod) => benchmarkMethod.name));
      filtered = new BenchmarkBundle({
        key: filtered.key,
        name: filtered.name,
        methodNames: filtered.methodNames.filter((methodName) => survivingNames.has(methodName)),
        benchmarkMethods: survivingMethods
      });
    }
  }

  return filtered.methodNames.length > 0 ? filtered : null;
}
