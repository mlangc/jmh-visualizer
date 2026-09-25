import 'react-spinkit';

// Its typings leave out that it passes any other props on to its <div>
declare module 'react-spinkit' {
  interface SpinnerProps {
    id?: string;
  }
}
