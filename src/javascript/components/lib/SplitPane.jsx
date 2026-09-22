import PropTypes from 'prop-types';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

export default function SplitPane(props) {
  return (
    <Container fluid={true}>
      <Row style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col xs={10} md={10}>
          {props.left}
        </Col>
        <Col xs={2} md={2}>
          <div className="bs-docs-sidebar">{props.right}</div>
        </Col>
      </Row>
    </Container>
  );
}

SplitPane.propTypes = {
  left: PropTypes.object.isRequired,
  right: PropTypes.object.isRequired
};
