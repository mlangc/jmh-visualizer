import React from 'react';
import PropTypes from 'prop-types';

import FormGroup from 'react-bootstrap/lib/FormGroup'
import InputGroup from 'react-bootstrap/lib/InputGroup'
import FormControl from 'react-bootstrap/lib/FormControl'

import DetailsIcon from 'react-icons/lib/fa/search-plus'
import EyeIcon from 'react-icons/lib/fa/eye'

import { actions, methodKey, paramValueKey } from 'store/store.js'
import TocList from 'components/TocList.jsx'
import Tooltipped from 'components/lib/Tooltipped.jsx'

// Side bar for SingleRunView, TwoRunViews, etc...
export default class RunSideBar extends React.Component {

  static propTypes = {
    benchmarkBundles: PropTypes.array.isRequired,
    metrics: PropTypes.array.isRequired,
    metricExtractor: PropTypes.object.isRequired,
    buttons: PropTypes.array,
    focusedBenchmarkBundles: PropTypes.object.isRequired,
    deselectedMethods: PropTypes.object.isRequired,
    deselectedParamValues: PropTypes.object.isRequired,
    categories: PropTypes.array.isRequired,
    activeCategory: PropTypes.string.isRequired,
  };

  render() {
    const { benchmarkBundles, metrics, metricExtractor, buttons, focusedBenchmarkBundles, deselectedMethods, deselectedParamValues, categories, activeCategory } = this.props;

    const metricsOptions = metrics.filter(aMetric => aMetric.startsWith('·') || aMetric === 'Score').map(metric => <option key={ metric } value={ metric }>
      { metric }
    </option>);

    const elementIds = benchmarkBundles.map(bundle => bundle.key);
    const elementNames = benchmarkBundles.map(bundle => bundle.name);

    const focusControlCreator = (elementId) => <span key={ `focus-${elementId}` } onClick={ (e) => {
      e.stopPropagation();
      actions.focusBundle(elementId)
    } } className={ focusedBenchmarkBundles.has(elementId) ? ' focused' : '' + ' clickable' }><sup><EyeIcon /></sup>{ ' ' }</span>;
    const detailsControlCreator = (elementId) => (<span key={ `detail-${elementId}` } onClick={ (e) => {
      e.stopPropagation();
      actions.detailBenchmarkBundle(elementId);
    } } className="clickable"><sup><DetailsIcon /></sup>{ ' ' }</span>);

    const paramListCreator = (bundleKey, methodName, methodInstances, methodEnabled) => {
      const paramNames = [];
      const valuesByParamName = {};
      methodInstances.forEach(benchmarkMethod => (benchmarkMethod.params || []).forEach(([paramName, value]) => {
        if (!valuesByParamName[paramName]) {
          valuesByParamName[paramName] = new Set();
          paramNames.push(paramName);
        }
        valuesByParamName[paramName].add(value);
      }));
      if (paramNames.length === 0) {
        return null;
      }
      return (
        <ul className="param-list">
          { paramNames.map(paramName => {
            const values = Array.from(valuesByParamName[paramName]);
            const singleValue = values.length === 1;
            return (
              <li key={ paramName }>
                <span className="param-name">{ paramName }</span>
                <ul className="param-value-list">
                  { values.map(value => {
                    const key = paramValueKey(bundleKey, methodName, paramName, value);
                    const checked = singleValue || !deselectedParamValues.has(key);
                    const disabled = singleValue || !methodEnabled;
                    return (
                      <li key={ key }>
                        <label onClick={ (e) => e.stopPropagation() } className={ disabled ? 'param-value-fixed' : undefined }>
                          <input
                            type="checkbox"
                            checked={ checked }
                            disabled={ disabled }
                            onChange={ () => actions.toggleParamValue(bundleKey, methodName, paramName, value) } />
                          { ' ' }{ value }
                        </label>
                      </li>
                    );
                  }) }
                </ul>
              </li>
            );
          }) }
        </ul>
      );
    };

    const methodListCreator = (bundleKey) => {
      const bundle = benchmarkBundles.find(aBundle => aBundle.key === bundleKey);
      if (!bundle || bundle.methodNames.length === 0) {
        return null;
      }
      return (
        <ul className="method-list">
          { bundle.methodNames.map(methodName => {
            const key = methodKey(bundleKey, methodName);
            const checked = !deselectedMethods.has(key);
            const methodInstances = bundle.benchmarkMethods.filter(benchmarkMethod => benchmarkMethod.name === methodName);
            return (
              <li key={ key }>
                <label onClick={ (e) => e.stopPropagation() }>
                  <input
                    type="checkbox"
                    checked={ checked }
                    onChange={ () => actions.toggleMethod(bundleKey, methodName) } />
                  { ' ' }{ methodName }
                </label>
                { paramListCreator(bundleKey, methodName, methodInstances, checked) }
              </li>
            );
          }) }
        </ul>
      );
    };

    return (
      <div>
        <FormGroup controlId="formControlsSelectMultiple" bsSize="small">
          <InputGroup>
            <Tooltipped tooltip="No secondary metrics found!!" position="bottom" disabled={ metrics.length > 1 }>
              <FormControl
                componentClass="select"
                onChange={ (event) => {
                  actions.selectMetric(event.target.value);
                } }
                value={ metricExtractor.metricKey }
                disabled={ metrics.length < 2 }>
                { metricsOptions }
              </FormControl>
            </Tooltipped>
          </InputGroup>
        </FormGroup>
        { buttons }
        <hr style={ { marginTop: '10px', marginBottom: '10px' } } />
        <TocList
          categories={ categories }
          activeCategory={ activeCategory }
          elementIds={ elementIds }
          elementNames={ elementNames }
          linkControlsCreators={ [focusControlCreator, detailsControlCreator] }
          subListCreator={ methodListCreator } />
      </div>
    );
  }

}