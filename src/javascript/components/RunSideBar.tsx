import MethodParamCheckboxList from 'components/lib/MethodParamCheckboxList.tsx';
import Tooltipped from 'components/lib/Tooltipped.tsx';
import TocList from 'components/TocList.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import React, { type MouseEvent, type ReactNode } from 'react';
import Form from 'react-bootstrap/Form';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { FaSearchPlus as DetailsIcon, FaEye as EyeIcon } from 'react-icons/fa';
import { actions, methodKey } from 'store/store.ts';

interface RunSideBarProps {
  benchmarkBundles: BenchmarkBundle[];
  metrics: string[];
  metricExtractor: MetricExtractor;
  buttons?: ReactNode[];
  focusedBenchmarkBundles: Set<string>;
  deselectedMethods: Set<string>;
  deselectedParamValues: Set<string>;
  categories: string[];
  activeCategory: string;
}

// Side bar for SingleRunView, TwoRunViews, etc...
export default class RunSideBar extends React.Component<RunSideBarProps> {
  render() {
    const {
      benchmarkBundles,
      metrics,
      metricExtractor,
      buttons,
      focusedBenchmarkBundles,
      deselectedMethods,
      deselectedParamValues,
      categories,
      activeCategory
    } = this.props;

    const metricsOptions = metrics
      .filter((aMetric) => aMetric.startsWith('·') || aMetric === 'Score')
      .map((metric) => (
        <option key={metric} value={metric}>
          {metric}
        </option>
      ));

    const elementIds = benchmarkBundles.map((bundle) => bundle.key);
    const elementNames = benchmarkBundles.map((bundle) => bundle.name);

    const focusControlCreator = (elementId: string) => (
      <span
        key={`focus-${elementId}`}
        onClick={(e) => {
          e.stopPropagation();
          actions.focusBundle(elementId);
        }}
        className={focusedBenchmarkBundles.has(elementId) ? ' focused' : '' + ' clickable'}
      >
        <sup>
          <EyeIcon />
        </sup>{' '}
      </span>
    );
    const detailsControlCreator = (elementId: string) => (
      <span
        key={`detail-${elementId}`}
        onClick={(e) => {
          e.stopPropagation();
          actions.detailBenchmarkBundle(elementId);
        }}
        className="clickable"
      >
        <sup>
          <DetailsIcon />
        </sup>{' '}
      </span>
    );

    const methodListCreator = (bundleKey: string) => {
      const bundle = benchmarkBundles.find((aBundle) => aBundle.key === bundleKey);
      return (
        <MethodParamCheckboxList
          bundleKey={bundleKey}
          bundle={bundle}
          deselectedMethods={deselectedMethods}
          deselectedParamValues={deselectedParamValues}
        />
      );
    };

    const selectAllMethodsCreator = (bundleKey: string) => {
      const bundle = benchmarkBundles.find((aBundle) => aBundle.key === bundleKey);
      if (!bundle || bundle.methodNames.length <= 1) {
        return null;
      }
      const anyDeselected = bundle.methodNames.some((methodName) =>
        deselectedMethods.has(methodKey(bundleKey, methodName))
      );
      if (!anyDeselected) {
        return null;
      }
      return (e: MouseEvent) => {
        e.stopPropagation();
        actions.selectAllMethods(bundleKey, bundle.methodNames);
      };
    };

    return (
      <div>
        <FormGroup controlId="formControlsSelectMultiple">
          <InputGroup>
            <Tooltipped tooltip="No secondary metrics found!!" position="bottom" disabled={metrics.length > 1}>
              <Form.Select
                size="sm"
                onChange={(event) => {
                  actions.selectMetric(event.target.value);
                }}
                value={metricExtractor.metricKey}
                disabled={metrics.length < 2}
              >
                {metricsOptions}
              </Form.Select>
            </Tooltipped>
          </InputGroup>
        </FormGroup>
        {buttons}
        <hr style={{ marginTop: '10px', marginBottom: '10px' }} />
        <TocList
          categories={categories}
          activeCategory={activeCategory}
          elementIds={elementIds}
          elementNames={elementNames}
          linkControlsCreators={[focusControlCreator, detailsControlCreator]}
          subListCreator={methodListCreator}
          doubleClickCreator={selectAllMethodsCreator}
          doubleClickTooltip="Double-click to select all methods"
        />
      </div>
    );
  }
}
