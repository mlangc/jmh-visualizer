import type BenchmarkMethod from 'models/BenchmarkMethod.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';

type Nested<T> = T | Nested<T>[];

export function arraysAreIdentical<T>(arr1: T[], arr2: T[]) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0, len = arr1.length; i < len; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export function groupBy<T, K extends keyof T>(xs: T[], key: K): { key: T[K]; values: T[] }[];
export function groupBy<T, K>(xs: T[], key: (x: T) => K): { key: K; values: T[] }[];
export function groupBy<T>(xs: T[], key: keyof T | ((x: T) => unknown)) {
  return xs.reduce<{ key: unknown; values: T[] }[]>((rv, x) => {
    const v = key instanceof Function ? key(x) : x[key];
    const el = rv.find((r) => r && r.key === v);
    if (el) {
      el.values.push(x);
    } else {
      rv.push({
        key: v,
        values: [x]
      });
    }
    return rv;
  }, []);
}

export function cartesianProduct<T>(arrayOfArrays: T[][]) {
  return arrayOfArrays.reduce<T[][]>(
    (a, b) => a.map((x) => b.map((y) => x.concat(y))).reduce((a, b) => a.concat(b), []),
    [[]]
  );
}

export function flatten<T>(arr: Nested<T>[], result: T[] = []): T[] {
  for (let i = 0, length = arr.length; i < length; i++) {
    const value = arr[i];
    if (Array.isArray(value)) {
      for (let i = 0, length = value.length; i < length; i++) {
        const value2 = value[i];
        if (Array.isArray(value2)) {
          flatten(value2, result);
        } else {
          result.push(value2 as T);
        }
      }
    } else {
      result.push(value as T);
    }
  }
  return result;
}

//If there is any score above 5, we do round
export function shouldRound(benchmarkMethods: BenchmarkMethod[], metricExtractor: MetricExtractor) {
  for (const benchmarkMethod of benchmarkMethods) {
    for (const benchmark of benchmarkMethod.benchmarks) {
      if (benchmark && metricExtractor.hasMetric(benchmark) && metricExtractor.extractScore(benchmark) > 5) {
        return true;
      }
    }
  }
  return false;
}

//Conditional round method
export function round(number: number, shouldRound: boolean) {
  if (!shouldRound || (number < 1 && number > -1)) {
    return number;
  }
  return Math.round(number);
}

//Conditional format number method
export function formatNumber(number: number | null | undefined, roundScores: boolean) {
  if (number || number === 0) {
    if (roundScores && (number > 1 || number < -1)) {
      return number.toLocaleString();
    } else {
      return number;
    }
  } else {
    return 'n/a';
  }
}

// Takes an array of strings and returns and array of strings. Common prefixes and suffixes will be removed.
export function getUniqueNames(strings: string[]) {
  if (strings.length === 1) {
    return strings.map((string) => extractAfterLastSlash(string));
  }

  var minLength = Math.min(...strings.map((string) => string.length));
  const startIndex = getNotMatchingStartIndex(strings, minLength);
  const endIndex = getNotMatchingEndIndex(strings, minLength);
  if (startIndex > 0 && startIndex < minLength) {
    strings = strings.map((string) => string.substring(startIndex));
  }
  if (endIndex > 0 && endIndex < minLength) {
    strings = strings.map((string) => string.substring(0, string.length - endIndex));
  }
  if (minLength - startIndex - endIndex > 20) {
    strings = strings.map((string) => extractAfterLastSlash(string));
  }
  return strings;
}

function extractAfterLastSlash(string: string) {
  const lastSlash = string.lastIndexOf('/');
  if (lastSlash > 0) {
    return string.substring(lastSlash + 1);
  } else {
    return string;
  }
}

function getNotMatchingStartIndex(strings: string[], minLength: number) {
  for (let i = 0; i < minLength; i++) {
    for (let j = 0; j < strings.length - 1; j++) {
      if (strings[j].charAt(i) !== strings[j + 1].charAt(i)) {
        return i;
      }
    }
  }
  return minLength;
}

function getNotMatchingEndIndex(strings: string[], minLength: number) {
  return getNotMatchingStartIndex(
    strings.map((string) => string.split('').reverse().join('')),
    minLength
  );
}
