import React from 'react';
import PropTypes from 'prop-types';

import Grid from 'react-bootstrap/lib/Grid'
import Row from 'react-bootstrap/lib/Row'
import Col from 'react-bootstrap/lib/Col'

export default function SplitPane(props) {

  return <Grid fluid={ true }>
    <Row style={ { display: 'flex', flexWrap: 'wrap' } }>
      <Col xs={ 14 } md={ 10 }>
        { props.left }
      </Col>
      <Col xs={ 4 } md={ 2 }>
        <div className='bs-docs-sidebar'>
          { props.right }
        </div>
      </Col>
    </Row>
  </Grid>;
}

SplitPane.propTypes = {
  left: PropTypes.object.isRequired,
  right: PropTypes.object.isRequired,
};