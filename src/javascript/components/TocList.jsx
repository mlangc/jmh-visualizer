import React from 'react';
import PropTypes from 'prop-types';

import { actions } from 'store/store.js'
import TocLink from 'components/TocLink.jsx'
import Tooltipped from 'components/lib/Tooltipped.jsx'

import {  scrollSpy, scroller } from 'react-scroll'

// Double-clicking text normally selects it (and can trigger a native lookup/search popup);
// suppress that so double-click can be used as a control gesture here.
const suppressTextSelectOnMultiClick = (e) => {
    if (e.detail > 1) {
        e.preventDefault();
    }
};

//Constructs a sidebar with a set of controls and links to the MainView sections
export default class TocList extends React.PureComponent {

    static propTypes = {
        categories: PropTypes.array.isRequired,
        activeCategory: PropTypes.string.isRequired,
        elementIds: PropTypes.array.isRequired,
        elementNames: PropTypes.array.isRequired,
        linkControlsCreators: PropTypes.array.isRequired,
        subListCreator: PropTypes.func,
        // Optional: (elementId) => onDoubleClick handler, or a falsy value to suppress the hint for that element
        doubleClickCreator: PropTypes.func,
        doubleClickTooltip: PropTypes.string,
    };

    componentDidMount() {
        scrollSpy.update();
    }

    scrollTo(elementId) {
        scroller.scrollTo(elementId, {
            duration: 500,
            delay: 50,
            smooth: 'linear',
            offset: -25
        });
    }

    render() {
        const { categories, activeCategory, elementIds, elementNames, linkControlsCreators, subListCreator, doubleClickCreator, doubleClickTooltip } = this.props;
        //TODO extract TocElement to own component and make onClick handlers unique: https://stackoverflow.com/a/38908620/672008
        return (
            <ul className="nav">
                { categories.map(category => <li key={ category } className={ category === activeCategory ? 'active' : '' }>
                    <div>
                        <a onClick={ () => actions.selectCategory(category) }>
                            { category }
                        </a>
                    </div>
                    <ul className='nav'>
                        { category === activeCategory ? elementIds.map((elementId, i) => {
                            const onDoubleClick = doubleClickCreator ? doubleClickCreator(elementId) : null;
                            const nameLink = <a
                                onClick={ this.scrollTo.bind(this, elementId) }
                                onMouseDown={ onDoubleClick ? suppressTextSelectOnMultiClick : undefined }
                                onDoubleClick={ onDoubleClick || undefined }>
                                { elementNames[i] }
                            </a>;
                            return <TocLink
                                key={ elementId }
                                activeClass="active"
                                to={ elementId }
                                spy={ true }
                                offset={ -200 }
                                duration={ 720 }
                                delay={ 50 }
                                smooth='easeOutSine'>
                                <div>
                                    { linkControlsCreators.map(linkControlCreator => linkControlCreator(elementId)) }
                                    { onDoubleClick ? <Tooltipped tooltip={ doubleClickTooltip } position="left">{ nameLink }</Tooltipped> : nameLink }
                                </div>
                                { subListCreator ? subListCreator(elementId) : null }
                            </TocLink>;
                        }) : '' }
                    </ul>
                </li>) }
            </ul>
        );
    }

}

