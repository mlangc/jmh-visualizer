import MethodParamCheckboxList from 'components/lib/MethodParamCheckboxList.jsx';
import TocList from 'components/TocList.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import Form from 'react-bootstrap/Form';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { MdKeyboardBackspace as BackIcon } from 'react-icons/md';
import { actions } from 'store/store.js';

export default class DetailSideBar extends React.Component {
  static propTypes = {
    benchmarkBundle: PropTypes.object.isRequired,
    benchmarkBundles: PropTypes.array.isRequired,
    secondaryMetrics: PropTypes.array.isRequired,
    deselectedMethods: PropTypes.object.isRequired,
    deselectedParamValues: PropTypes.object.isRequired,
    buttons: PropTypes.array
  };

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
          selectCategoryFunction={(category) => alert(category)}
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
