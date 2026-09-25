import { exampleRun1 } from 'exampleBenchmark1.js';
import { exampleRun2 } from 'exampleBenchmark2.js';
import { exampleRun3 } from 'exampleBenchmark3.js';
import { createBrowserHistory } from 'history';
import BenchmarkRun from 'models/BenchmarkRun.js';
import BenchmarkSelection from 'models/BenchmarkSelection.js';
import Examples from 'models/Examples.js';
import { createElement, memo } from 'react';
import {
  addSettingsFromParameters,
  getBenchmarksLoadFunctionForDefinedExamples,
  getBenchmarksLoadFunctionForSourceExamples
} from 'store/processParameters.js';
import { createStore, useStore } from 'zustand';

const history = createBrowserHistory();

const examples = new Examples({
  run1: new BenchmarkRun({
    name: 'run1',
    benchmarks: exampleRun1
  }),
  run2: new BenchmarkRun({
    name: 'run2',
    benchmarks: exampleRun2
  }),
  run3: new BenchmarkRun({
    name: 'run3',
    benchmarks: exampleRun3
  })
});

// Get default settings from settings.js and enrich with parameters
const settings = defaultSettings;
addSettingsFromParameters(settings);

// Load benchmarks from defined source (provided || example || remote source)
let benchmarkLoadFunction = null;
if (providedBenchmarks.length > 0) {
  benchmarkLoadFunction = (initBenchmarksFunction) =>
    initBenchmarksFunction(
      providedBenchmarks.map(
        (runName) =>
          new BenchmarkRun({
            name: runName,
            benchmarks: providedBenchmarkStore[runName]
          })
      )
    );
} else {
  benchmarkLoadFunction = getBenchmarksLoadFunctionForDefinedExamples(examples);
  if (!benchmarkLoadFunction) {
    benchmarkLoadFunction = getBenchmarksLoadFunctionForSourceExamples();
  }
}

// Setup store
const config = {
  initialState: {
    settings: settings,
    initialLoading: benchmarkLoadFunction != null,
    loading: false,
    benchmarkRuns: [],
    runSelection: [], // boolean[runs]
    runView: null, // null || Summary || Compare
    selectedMetric: 'Score',
    detailedBenchmarkBundle: null,
    activeCategory: 'Benchmarks',
    focusedBundles: new Set(),
    deselectedMethods: new Set(),
    deselectedParamValues: new Set(),
    chartConfig: {
      sort: false,
      logScale: false
    }
  },
  actionsCreators: {
    uploadFiles: async (state, actions, files, trigger) =>
      loadBenchmarksAsync(
        state,
        trigger,
        () => actions.uploadFiles(files, true),
        () => parseBenchmarks(files)
      ),
    initBenchmarks: (_state, _actions, benchmarkRuns) => {
      return stateForBenchmarks(benchmarkRuns);
    },
    loadSingleRunExample: (state, actions, _param, trigger) =>
      loadBenchmarksAsync(
        state,
        trigger,
        () => actions.loadSingleRunExample(null, true),
        () => getExamples(examples.singleRunExample)
      ),
    loadTwoRunsExample: (state, actions, _param, trigger) =>
      loadBenchmarksAsync(
        state,
        trigger,
        () => actions.loadTwoRunsExample(null, true),
        () => getExamples(examples.twoRunsExample)
      ),
    loadMultiRunExample: (state, actions, _param, trigger) =>
      loadBenchmarksAsync(
        state,
        trigger,
        () => actions.loadMultiRunExample(null, true),
        () => getExamples(examples.multiRunExample)
      ),
    selectMetric: (_state, _actions, newSelectedMetric) => ({ selectedMetric: newSelectedMetric }),
    focusBundle: (state, _actions, benchmarkBundleName) => {
      const clonedFocusedBundles = new Set(state.focusedBundles);
      const alreadyFocused = clonedFocusedBundles.has(benchmarkBundleName);
      if (alreadyFocused) {
        clonedFocusedBundles.delete(benchmarkBundleName);
      } else {
        clonedFocusedBundles.add(benchmarkBundleName);
      }
      return { focusedBundles: clonedFocusedBundles };
    },
    toggleMethod: (state, _actions, benchmarkBundleKey, methodName) => {
      const key = methodKey(benchmarkBundleKey, methodName);
      const clonedDeselectedMethods = new Set(state.deselectedMethods);
      const alreadyDeselected = clonedDeselectedMethods.has(key);
      if (alreadyDeselected) {
        clonedDeselectedMethods.delete(key);
      } else {
        clonedDeselectedMethods.add(key);
      }
      return { deselectedMethods: clonedDeselectedMethods };
    },
    toggleParamValue: (state, _actions, benchmarkBundleKey, methodName, paramName, value) => {
      const key = paramValueKey(benchmarkBundleKey, methodName, paramName, value);
      const clonedDeselectedParamValues = new Set(state.deselectedParamValues);
      const alreadyDeselected = clonedDeselectedParamValues.has(key);
      if (alreadyDeselected) {
        clonedDeselectedParamValues.delete(key);
      } else {
        clonedDeselectedParamValues.add(key);
        const benchmarkSelection = new BenchmarkSelection(state.benchmarkRuns, state.runSelection);
        const bundle = benchmarkSelection.benchmarkBundles.find((aBundle) => aBundle.key === benchmarkBundleKey);
        const survives = bundle?.benchmarkMethods.some(
          (benchmarkMethod) =>
            benchmarkMethod.name === methodName &&
            !isMethodInstanceDeselected(benchmarkBundleKey, benchmarkMethod, clonedDeselectedParamValues)
        );
        if (!survives) {
          return {}; // would hide every instance of this method - refuse the toggle
        }
      }
      return { deselectedParamValues: clonedDeselectedParamValues };
    },
    // Deselects every other method in the bundle, keeping only methodName selected.
    selectOnlyMethod: (state, _actions, benchmarkBundleKey, methodName, allMethodNames) => {
      const clonedDeselectedMethods = new Set(state.deselectedMethods);
      allMethodNames.forEach((otherMethodName) => {
        const key = methodKey(benchmarkBundleKey, otherMethodName);
        if (otherMethodName === methodName) {
          clonedDeselectedMethods.delete(key);
        } else {
          clonedDeselectedMethods.add(key);
        }
      });
      return { deselectedMethods: clonedDeselectedMethods };
    },
    // Re-selects every method in the bundle.
    selectAllMethods: (state, _actions, benchmarkBundleKey, allMethodNames) => {
      const clonedDeselectedMethods = new Set(state.deselectedMethods);
      allMethodNames.forEach((methodName) => {
        clonedDeselectedMethods.delete(methodKey(benchmarkBundleKey, methodName));
      });
      return { deselectedMethods: clonedDeselectedMethods };
    },
    // Deselects every other value of paramName (for methodName), keeping only value selected.
    selectOnlyParamValue: (state, _actions, benchmarkBundleKey, methodName, paramName, value, allValues) => {
      const clonedDeselectedParamValues = new Set(state.deselectedParamValues);
      allValues.forEach((aValue) => {
        const key = paramValueKey(benchmarkBundleKey, methodName, paramName, aValue);
        if (aValue === value) {
          clonedDeselectedParamValues.delete(key);
        } else {
          clonedDeselectedParamValues.add(key);
        }
      });
      const benchmarkSelection = new BenchmarkSelection(state.benchmarkRuns, state.runSelection);
      const bundle = benchmarkSelection.benchmarkBundles.find((aBundle) => aBundle.key === benchmarkBundleKey);
      const survives = bundle?.benchmarkMethods.some(
        (benchmarkMethod) =>
          benchmarkMethod.name === methodName &&
          !isMethodInstanceDeselected(benchmarkBundleKey, benchmarkMethod, clonedDeselectedParamValues)
      );
      if (!survives) {
        return {}; // would hide every instance of this method - refuse the change
      }
      return { deselectedParamValues: clonedDeselectedParamValues };
    },
    // Re-selects every value of paramName (for methodName).
    selectAllParamValues: (state, _actions, benchmarkBundleKey, methodName, paramName, allValues) => {
      const clonedDeselectedParamValues = new Set(state.deselectedParamValues);
      allValues.forEach((value) => {
        clonedDeselectedParamValues.delete(paramValueKey(benchmarkBundleKey, methodName, paramName, value));
      });
      return { deselectedParamValues: clonedDeselectedParamValues };
    },
    selectCategory: (_state, _actions, category) => {
      return { activeCategory: category, focusedBundles: new Set() };
    },
    detailBenchmarkBundle: (_state, _actions, benchmarkBundleKey) => {
      history.push('#details');
      return { detailedBenchmarkBundle: benchmarkBundleKey };
    },
    undetailBenchmarkBundle: () => {
      return { detailedBenchmarkBundle: null };
    },
    // expects array of boolean with length of total JMH runs + the runView ('Summary', 'Compare')
    selectBenchmarkRuns: (_state, _action, runSelection, runView) => {
      return { runSelection: runSelection, runView: runView };
    },
    sort: (state) => {
      return { chartConfig: { ...state.chartConfig, sort: !state.chartConfig.sort } };
    },
    logScale: (state) => {
      return { chartConfig: { ...state.chartConfig, logScale: !state.chartConfig.logScale } };
    },
    goBack: () => {
      history.back();
      return {};
    }
  }
};

function stateForBenchmarks(benchmarkRuns) {
  const runView = benchmarkRuns.length > 1 ? 'Summary' : null;
  const runSelection = Array(benchmarkRuns.length).fill(true);
  return {
    initialLoading: false,
    loading: false,
    benchmarkRuns: benchmarkRuns,
    runSelection: runSelection,
    runView: runView
  };
}

async function loadBenchmarksAsync(_state, trigger, triggerFunction, getBenchmarksFunction) {
  if (trigger) {
    return { loading: true };
  } else {
    await triggerFunction();
  }

  try {
    const benchmarkRuns = await getBenchmarksFunction();
    return stateForBenchmarks(benchmarkRuns);
  } catch (_error) {
    return stateForBenchmarks([]);
  }
}

const store = createStore(() => config.initialState);

// A synchronous creator's update is applied right away (still within the calling event
// handler), an async one's once it resolves, merged into the state current at that point.
export const actions = Object.fromEntries(
  Object.entries(config.actionsCreators).map(([name, actionCreator]) => [
    name,
    (...args) => {
      const update = actionCreator(store.getState(), actions, ...args);
      return update?.then ? update.then((resolved) => store.setState(resolved)) : store.setState(update);
    }
  ])
);

// The store is module-level, so there's nothing to provide. Kept so entry.jsx stays unchanged.
export function Provider({ children }) {
  return children;
}

// Subscribes to the whole state, which keeps its identity between updates, and maps it
// to props during render rather than in a selector: mapStateToProps may build fresh
// objects (e.g. a new BenchmarkSelection) on every call. memo skips re-rendering the
// wrapped component when those props are shallowly equal.
export function connect(mapStateToProps) {
  return (Component) => {
    const MemoizedComponent = memo(Component);
    const Connected = (ownProps) => {
      const state = useStore(store);
      return createElement(MemoizedComponent, { ...ownProps, ...mapStateToProps(state, ownProps) });
    };
    Connected.displayName = `Connect(${Component.displayName || Component.name || 'Unknown'})`;
    return Connected;
  };
}

export function methodKey(benchmarkBundleKey, methodName) {
  return `${benchmarkBundleKey}::${methodName}`;
}

export function paramValueKey(benchmarkBundleKey, methodName, paramName, value) {
  return `${methodKey(benchmarkBundleKey, methodName)}::${paramName}=${value}`;
}

// Whether a specific parameterized BenchmarkMethod instance is hidden because one of its param values got deselected
export function isMethodInstanceDeselected(benchmarkBundleKey, benchmarkMethod, deselectedParamValues) {
  if (!benchmarkMethod.params) {
    return false;
  }
  return benchmarkMethod.params.some(([paramName, value]) =>
    deselectedParamValues.has(paramValueKey(benchmarkBundleKey, benchmarkMethod.name, paramName, value))
  );
}

history.listen(({ action }) => {
  if (action === 'POP') {
    actions.undetailBenchmarkBundle();
  }
});

if (benchmarkLoadFunction) {
  setTimeout(() => benchmarkLoadFunction(actions.initBenchmarks), 0);
}

function getExamples(benchmarkRuns) {
  return new Promise((resolve) => setTimeout(() => resolve(benchmarkRuns), 0));
}

function parseBenchmarks(files) {
  return new Promise((resolve, reject) => {
    const benchmarkRuns = [];
    files.forEach((file) => {
      const reader = new FileReader();
      const runName = file.name.replace('.json', '');
      reader.onload = (evt) => {
        try {
          const parsedBenchmarks = JSON.parse(evt.target.result);
          const benchmarkRun = new BenchmarkRun({
            name: runName,
            benchmarks: parsedBenchmarks
          });
          benchmarkRuns.push(benchmarkRun);
          if (benchmarkRuns.length === files.length) {
            benchmarkRuns.sort((a, b) => a.name.localeCompare(b.name));
            window.onbeforeunload = () => 'You will loose the current benchmarks.';
            resolve(benchmarkRuns);
          }
        } catch (e) {
          alert(e); //error in the above string(in this case,yes)!
          reject(e);
        }
      };
      reader.readAsText(file);
    });
  });
}
