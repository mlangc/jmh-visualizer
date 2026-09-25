import { BugIcon, GithubIcon } from 'components/Icons.tsx';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import { connect } from 'store/store.ts';

const Footer = ({ topBar }: { topBar: string }) => {
  if (topBar === 'default') {
    return null;
  }
  return (
    <Card.Footer style={{ marginTop: '20px', marginBottom: '0px', paddingLeft: '20px', fontSize: '0.90em' }}>
      <Container fluid={true}>
        <Row>
          <Col md={10}>
            <a href="https://jmh.morethan.io" target="_blank" rel="noopener noreferrer">
              JMH Visualizer {process.env.version}
            </a>
          </Col>
          <Col md={2}>
            <a href="https://github.com/jzillmann/jmh-visualizer" target="_blank" rel="noopener noreferrer">
              <GithubIcon size="1.5em" />
            </a>
            {' | '}
            <a href="https://github.com/jzillmann/jmh-visualizer/issues" target="_blank" rel="noopener noreferrer">
              <BugIcon size="1.5em" />
            </a>
          </Col>
        </Row>
      </Container>
    </Card.Footer>
  );
};

export default connect(({ settings }) => ({
  topBar: settings.topBar
}))(Footer);
