import Tooltipped from 'components/lib/Tooltipped.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type BenchmarkMethod from 'models/BenchmarkMethod.ts';
import type { MouseEvent } from 'react';
import { actions, methodKey, paramValueKey } from 'store/store.ts';

// Per-method and (nested) per-param-value checkboxes for one benchmark bundle.
// Shared by RunSideBar (one instance per benchmark class) and DetailSideBar
// (one instance for the single class being inspected).
//
// Double-click support (each hint is suppressed when it would be a NOP):
//   - a method checkbox: exclusively selects that method among the bundle's methods
//   - a param name: re-selects every value of that param (for that method)
//   - a param value checkbox: exclusively selects that value among its param's values
// Double-clicking text normally selects it (and can trigger a native lookup/search popup);
// suppress that so double-click can be used as a control gesture here.
const suppressTextSelectOnMultiClick = (e: MouseEvent) => {
  if (e.detail > 1) {
    e.preventDefault();
  }
};

interface MethodParamCheckboxListProps {
  bundleKey: string;
  bundle?: BenchmarkBundle;
  deselectedMethods: Set<string>;
  deselectedParamValues: Set<string>;
}

export default function MethodParamCheckboxList({
  bundleKey,
  bundle,
  deselectedMethods,
  deselectedParamValues
}: MethodParamCheckboxListProps) {
  if (!bundle || bundle.methodNames.length === 0) {
    return null;
  }

  const paramListCreator = (methodName: string, methodInstances: BenchmarkMethod[], methodEnabled: boolean) => {
    const paramNames: string[] = [];
    const valuesByParamName: Record<string, Set<string>> = {};
    methodInstances.forEach((benchmarkMethod) => {
      (benchmarkMethod.params || []).forEach(([paramName, value]) => {
        if (!valuesByParamName[paramName]) {
          valuesByParamName[paramName] = new Set();
          paramNames.push(paramName);
        }
        valuesByParamName[paramName].add(value);
      });
    });
    if (paramNames.length === 0) {
      return null;
    }
    return (
      <ul className="param-list">
        {paramNames.map((paramName) => {
          const values = Array.from(valuesByParamName[paramName]);
          const singleValue = values.length === 1;

          const anyValueDeselected = values.some((value) =>
            deselectedParamValues.has(paramValueKey(bundleKey, methodName, paramName, value))
          );
          const paramNameDoubleClickEnabled = methodEnabled && !singleValue && anyValueDeselected;
          const paramNameSpan = (
            <span
              className="param-name"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={suppressTextSelectOnMultiClick}
              onDoubleClick={
                paramNameDoubleClickEnabled
                  ? (e) => {
                      e.stopPropagation();
                      actions.selectAllParamValues(bundleKey, methodName, paramName, values);
                    }
                  : undefined
              }
            >
              {paramName}
            </span>
          );

          return (
            <li key={paramName}>
              {paramNameDoubleClickEnabled ? (
                <Tooltipped tooltip="Double-click to select all values" position="left">
                  {paramNameSpan}
                </Tooltipped>
              ) : (
                paramNameSpan
              )}
              <ul className="param-value-list">
                {values.map((value) => {
                  const key = paramValueKey(bundleKey, methodName, paramName, value);
                  const checked = singleValue || !deselectedParamValues.has(key);
                  const disabled = singleValue || !methodEnabled;

                  const otherValues = values.filter((aValue) => aValue !== value);
                  const isOnlyValueSelected =
                    checked &&
                    otherValues.every((aValue) =>
                      deselectedParamValues.has(paramValueKey(bundleKey, methodName, paramName, aValue))
                    );
                  const valueDoubleClickEnabled = !disabled && !isOnlyValueSelected;

                  const valueLabel = (
                    <label
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={suppressTextSelectOnMultiClick}
                      onDoubleClick={
                        valueDoubleClickEnabled
                          ? (e) => {
                              e.stopPropagation();
                              actions.selectOnlyParamValue(bundleKey, methodName, paramName, value, values);
                            }
                          : undefined
                      }
                      className={disabled ? 'param-value-fixed' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => actions.toggleParamValue(bundleKey, methodName, paramName, value)}
                      />{' '}
                      {value}
                    </label>
                  );

                  return (
                    <li key={key}>
                      {valueDoubleClickEnabled ? (
                        <Tooltipped tooltip="Double-click to select only this value" position="left">
                          {valueLabel}
                        </Tooltipped>
                      ) : (
                        valueLabel
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <ul className="method-list">
      {bundle.methodNames.map((methodName) => {
        const key = methodKey(bundleKey, methodName);
        const checked = !deselectedMethods.has(key);
        const methodInstances = bundle.benchmarkMethods.filter(
          (benchmarkMethod) => benchmarkMethod.name === methodName
        );

        const otherMethodNames = bundle.methodNames.filter((aMethodName) => aMethodName !== methodName);
        const isOnlyMethodSelected =
          checked && otherMethodNames.every((aMethodName) => deselectedMethods.has(methodKey(bundleKey, aMethodName)));
        const methodDoubleClickEnabled = bundle.methodNames.length > 1 && !isOnlyMethodSelected;

        const methodLabel = (
          <label
            onClick={(e) => e.stopPropagation()}
            onMouseDown={suppressTextSelectOnMultiClick}
            onDoubleClick={
              methodDoubleClickEnabled
                ? (e) => {
                    e.stopPropagation();
                    actions.selectOnlyMethod(bundleKey, methodName, bundle.methodNames);
                  }
                : undefined
            }
          >
            <input type="checkbox" checked={checked} onChange={() => actions.toggleMethod(bundleKey, methodName)} />{' '}
            {methodName}
          </label>
        );

        return (
          <li key={key}>
            {methodDoubleClickEnabled ? (
              <Tooltipped tooltip="Double-click to select only this method" position="left">
                {methodLabel}
              </Tooltipped>
            ) : (
              methodLabel
            )}
            {paramListCreator(methodName, methodInstances, checked)}
          </li>
        );
      })}
    </ul>
  );
}
