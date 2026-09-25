import React, { type HTMLAttributes } from 'react';

import { ScrollLink } from 'react-scroll';

// A link in TocSidebar pointing to a TocElement
class TocLink extends React.Component<HTMLAttributes<HTMLLIElement>> {
  render() {
    return <li {...this.props}>{this.props.children}</li>;
  }
}

const EnhancedTocLink = ScrollLink(TocLink);

export { EnhancedTocLink as default };
