import MethodParamCheckboxList from 'components/lib/MethodParamCheckboxList.tsx';
import TocList from 'components/TocList.tsx';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import React, { type ReactNode } from 'react';
import Form from 'react-bootstrap/Form';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { MdKeyboardBackspace as BackIcon } from 'react-icons/md';
import { actions } from 'store/store.ts';

interface DetailSideBarProps {
  benchmarkBundle: BenchmarkBundle;
  benchmarkBundles: BenchmarkBundle[];
  secondaryMetrics: string[];
  deselectedMethods: Set<string>;
  deselectedParamValues: Set<string>;
  buttons?: ReactNode[];
}

export default class DetailSideBar extends React.Component<DetailSideBarProps> {
  render() {
    const { benchmarkBundle, benchmarkBundles, secondaryMetrics, deselectedMethods, deselectedParamValues, buttons } =
      this.props;
    const benchmarkBundleOptions = benchmarkBundles.map((bundle) => (
      <option key={bundle.key} value={bundle.key}>
        {bundle.name}
      </option>
    ));

    const metrics = ['Score'].concat(secondaryMetrics);

    return (
      <div>
        <a onClick={() => actions.goBack()}>
          <BackIcon /> Back..
        </a>
        <br />
        <br />
        <FormGroup controlId="theForm">
          <InputGroup>
            <Form.Select
              size="sm"
              onChange={(event) => actions.detailBenchmarkBundle(event.target.value)}
              defaultValue={benchmarkBundle.key}
            >
              {benchmarkBundleOptions}
            </Form.Select>
          </InputGroup>
        </FormGroup>
        {buttons}
        <hr style={{ marginTop: '10px', marginBottom: '10px' }} />
        <TocList
          categories={['Metrics']}
          activeCategory={'Metrics'}
          elementIds={metrics}
          elementNames={metrics}
          linkControlsCreators={[]}
        />
        <hr style={{ marginTop: '10px', marginBottom: '10px' }} />
        <div className="nav">
          <MethodParamCheckboxList
            bundleKey={benchmarkBundle.key}
            bundle={benchmarkBundle}
            deselectedMethods={deselectedMethods}
            deselectedParamValues={deselectedParamValues}
          />
        </div>
      </div>
    );
  }
}
