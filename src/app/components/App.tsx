import DetailScreen from 'components/DetailScreen.tsx';
import DoingWorkSpinner from 'components/DoingWorkSpinner.tsx';
import Footer from 'components/global/Footer.tsx';
import TopBar from 'components/global/TopBar.tsx';
import RunScreen from 'components/RunScreen.tsx';

import RunSelectionBar from 'components/RunSelectionBar.tsx';
import SummaryScreen from 'components/SummaryScreen.tsx';
import UploadScreen from 'components/UploadScreen.tsx';
import type { ReactElement } from 'react';
import { connect, type State } from 'store/store.ts';

type AppProps = Pick<
  State,
  'initialLoading' | 'benchmarkRuns' | 'runSelection' | 'runView' | 'detailedBenchmarkBundle'
>;

const App = ({ initialLoading, benchmarkRuns, runSelection, runView, detailedBenchmarkBundle }: AppProps) => {
  if (initialLoading) {
    return (
      <div style={{ position: 'fixed', top: '50%', left: '50%' }}>
        <DoingWorkSpinner />
      </div>
    );
  }
  let screen: ReactElement;
  if (benchmarkRuns.length === 0) {
    screen = <UploadScreen />;
  } else {
    if (detailedBenchmarkBundle) {
      // Details View
      screen = <DetailScreen />;
    } else {
      // Run View
      const selectedRuns = runSelection.filter((isSelected) => isSelected);
      if (selectedRuns.length > 1 && runView === 'Summary') {
        screen = <SummaryScreen />;
      } else {
        screen = <RunScreen />;
      }
    }
  }

  return (
    <div>
      <TopBar />
      <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <RunSelectionBar />
        {screen}
      </div>
      <Footer />
    </div>
  );
};

export default connect(({ initialLoading, benchmarkRuns, runSelection, runView, detailedBenchmarkBundle }) => ({
  initialLoading,
  benchmarkRuns,
  runSelection,
  runView,
  detailedBenchmarkBundle
}))(App);
