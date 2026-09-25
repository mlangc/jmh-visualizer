import Tooltipped from 'components/lib/Tooltipped.tsx';
import TocLink from 'components/TocLink.tsx';
import React, { type MouseEvent, type ReactNode } from 'react';
import { scroller, scrollSpy } from 'react-scroll';
import { actions } from 'store/store.ts';

// Double-clicking text normally selects it (and can trigger a native lookup/search popup);
// suppress that so double-click can be used as a control gesture here.
const suppressTextSelectOnMultiClick = (e: MouseEvent) => {
  if (e.detail > 1) {
    e.preventDefault();
  }
};

interface TocListProps {
  categories: string[];
  activeCategory: string;
  elementIds: string[];
  elementNames: string[];
  linkControlsCreators: ((elementId: string) => ReactNode)[];
  subListCreator?: (elementId: string) => ReactNode;
  // Returns the onDoubleClick handler, or a falsy value to suppress the hint for that element
  doubleClickCreator?: (elementId: string) => ((e: MouseEvent) => void) | null;
  doubleClickTooltip?: string;
}

//Constructs a sidebar with a set of controls and links to the MainView sections
export default class TocList extends React.PureComponent<TocListProps> {
  componentDidMount() {
    scrollSpy.update();
  }

  scrollTo(elementId: string) {
    scroller.scrollTo(elementId, {
      duration: 500,
      delay: 50,
      smooth: 'linear',
      offset: -25
    });
  }

  render() {
    const {
      categories,
      activeCategory,
      elementIds,
      elementNames,
      linkControlsCreators,
      subListCreator,
      doubleClickCreator,
      doubleClickTooltip
    } = this.props;
    //TODO extract TocElement to own component and make onClick handlers unique: https://stackoverflow.com/a/38908620/672008
    return (
      <ul className="nav">
        {categories.map((category) => (
          <li key={category} className={category === activeCategory ? 'active' : ''}>
            <div>
              <a onClick={() => actions.selectCategory(category)}>{category}</a>
            </div>
            <ul className="nav">
              {category === activeCategory
                ? elementIds.map((elementId, i) => {
                    const onDoubleClick = doubleClickCreator ? doubleClickCreator(elementId) : null;
                    const nameLink = (
                      <a
                        onClick={this.scrollTo.bind(this, elementId)}
                        onMouseDown={onDoubleClick ? suppressTextSelectOnMultiClick : undefined}
                        onDoubleClick={onDoubleClick || undefined}
                      >
                        {elementNames[i]}
                      </a>
                    );
                    return (
                      <TocLink
                        key={elementId}
                        activeClass="active"
                        to={elementId}
                        spy={true}
                        offset={-200}
                        duration={720}
                        delay={50}
                        smooth="easeOutSine"
                      >
                        <div>
                          {linkControlsCreators.map((linkControlCreator) => linkControlCreator(elementId))}
                          {onDoubleClick ? (
                            <Tooltipped tooltip={doubleClickTooltip} position="left">
                              {nameLink}
                            </Tooltipped>
                          ) : (
                            nameLink
                          )}
                        </div>
                        {subListCreator ? subListCreator(elementId) : null}
                      </TocLink>
                    );
                  })
                : ''}
            </ul>
          </li>
        ))}
      </ul>
    );
  }
}
