import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import SplitButton from 'react-bootstrap/SplitButton';

import { actions, connect } from 'store/store.js';

function selectSingleRun(benchmarkRuns, runView, runIndex) {
  const runSelection = benchmarkRuns.map((_run, index) => {
    if (index === runIndex) {
      return true;
    } else {
      return false;
    }
  });
  actions.selectBenchmarkRuns(runSelection, runView);
}

function selectAll(oldRunSelection, runView) {
  const runSelection = oldRunSelection.map(() => true);
  actions.selectBenchmarkRuns(runSelection, runView);
}

function selectAllWithPossibleSwitchView(oldRunSelection, runView) {
  let runSelection;
  if (oldRunSelection.some((elem) => !elem)) {
    runSelection = oldRunSelection.map(() => true);
  } else {
    runSelection = oldRunSelection;
    if (runView === 'Compare') {
      runView = 'Summary';
    } else {
      runView = 'Compare';
    }
  }
  actions.selectBenchmarkRuns(runSelection, runView);
}

function getPossibleRunViews(benchmarkRuns, detailedBenchmarkBundle) {
  if (benchmarkRuns.length < 2) {
    return [];
  }
  if (detailedBenchmarkBundle) {
    return ['Compare'];
  }
  return ['Summary', 'Compare'];
}

/* eslint react/prop-types: 0 */
// A selection bar for 2 or more runs, selecting either a single run or a compare view
const RunSelectionBar = ({ benchmarkRuns, runSelection, runView, detailedBenchmarkBundle }) => {
  if (benchmarkRuns.length <= 1) {
    return null;
  }

  const runViews = getPossibleRunViews(benchmarkRuns, detailedBenchmarkBundle);
  const showAll = runSelection.reduce((showIt, showRun) => showIt && showRun);

  const runComponents = runSelection.map((_run, index) => {
    const isActive = !showAll && runSelection[index];
    return (
      <Button
        key={index}
        variant={isActive ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => selectSingleRun(benchmarkRuns, runView, index)}
      >
        {benchmarkRuns[index].name}
      </Button>
    );
  });
  let allButton;
  if (runViews.length > 1) {
    const runViewMenuItems = runViews.map((runViewLabel) => (
      <Dropdown.Item key={runViewLabel} role="menuitem" onClick={() => selectAll(runSelection, runViewLabel)}>
        {runViewLabel}
      </Dropdown.Item>
    ));
    allButton = (
      <SplitButton
        id="all"
        title={runView}
        variant={showAll ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => selectAllWithPossibleSwitchView(runSelection, runView)}
      >
        {runViewMenuItems}
      </SplitButton>
    );
  } else {
    allButton = (
      <Button variant={showAll ? 'primary' : 'secondary'} size="sm" onClick={() => selectAll(runSelection, runView)}>
        {runViews[0]}
      </Button>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '-9px', marginBottom: '15px', paddingRight: '20%' }}>
      <ButtonGroup>{runComponents}</ButtonGroup> <ButtonGroup>{allButton}</ButtonGroup>
    </div>
  );
};

export default connect(({ benchmarkRuns, runSelection, runView, detailedBenchmarkBundle }) => ({
  benchmarkRuns,
  runSelection,
  runView,
  detailedBenchmarkBundle
}))(RunSelectionBar);
