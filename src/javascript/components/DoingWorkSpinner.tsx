import { blue } from 'functions/colors.ts';
import Spinner from 'react-spinkit';
import { connect } from 'store/store.ts';

// Its typings leave out that it passes any other props on to its <div>
declare module 'react-spinkit' {
  interface SpinnerProps {
    id?: string;
  }
}

interface DoingWorkSpinnerProps {
  initialLoading: boolean;
  loading: boolean;
}

const DoingWorkSpinner = ({ initialLoading, loading }: DoingWorkSpinnerProps) => {
  if (!initialLoading && !loading) {
    return null;
  }
  return <Spinner id="spinner" name="three-bounce" color={blue} fadeIn="none" />;
};

export default connect(({ initialLoading, loading }) => ({ initialLoading, loading }))(DoingWorkSpinner);
