// The package ships no typings; these mirror its propTypes (as far as this app uses them)
declare module '@appigram/react-rangeslider' {
  import type { ComponentType } from 'react';

  interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    labels?: Record<number, string>;
    format?: (value: number) => string;
    onChange?: (value: number) => void;
  }

  const Slider: ComponentType<SliderProps>;
  export default Slider;
}
