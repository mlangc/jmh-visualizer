import React, { type ReactNode } from 'react';

import { Element } from 'react-scroll';

interface TocElementProps {
  name: string;
  children: ReactNode;
}

//An element in the main content of a page linked by a TocLink within a TocSideBar
export default class TocElement extends React.Component<TocElementProps> {
  render() {
    return <Element {...this.props}>{this.props.children}</Element>;
  }
}
