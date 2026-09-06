import React from 'react';
import PropTypes from 'prop-types';

import { actions, methodKey, paramValueKey } from 'store/store.js'

// Per-method and (nested) per-param-value checkboxes for one benchmark bundle.
// Shared by RunSideBar (one instance per benchmark class) and DetailSideBar
// (one instance for the single class being inspected).
export default function MethodParamCheckboxList({ bundleKey, bundle, deselectedMethods, deselectedParamValues }) {

  if (!bundle || bundle.methodNames.length === 0) {
    return null;
  }

  const paramListCreator = (methodName, methodInstances, methodEnabled) => {
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
            { paramListCreator(methodName, methodInstances, checked) }
          </li>
        );
      }) }
    </ul>
  );
}

MethodParamCheckboxList.propTypes = {
  bundleKey: PropTypes.string.isRequired,
  bundle: PropTypes.object,
  deselectedMethods: PropTypes.object.isRequired,
  deselectedParamValues: PropTypes.object.isRequired,
};
