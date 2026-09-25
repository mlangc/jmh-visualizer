import SplitPane from 'components/lib/SplitPane.tsx';
import UploadMainView from 'components/UploadMainView.tsx';
import UploadSideBar from 'components/UploadSideBar.tsx';

const UploadScreen = () => {
  return <SplitPane left={<UploadMainView />} right={<UploadSideBar />} />;
};

export default UploadScreen;
