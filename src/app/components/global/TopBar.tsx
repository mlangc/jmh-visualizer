import CustomTopBar from 'components/global/CustomTopBar.tsx';
import DefaultTopBar from 'components/global/DefaultTopBar.tsx';
import { connect } from 'store/store.ts';

const TopBar = ({ topBar }: { topBar: string }) => {
  switch (topBar) {
    case 'default':
      return <DefaultTopBar />;
    case 'off':
      return null;
    default:
      return <CustomTopBar title={topBar} />;
  }
};

export default connect(({ settings }) => ({
  topBar: settings.topBar
}))(TopBar);
