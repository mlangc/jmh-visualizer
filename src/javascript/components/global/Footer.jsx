import { BugIcon, GithubIcon } from 'components/Icons.jsx';
import Col from 'react-bootstrap/lib/Col';
import Grid from 'react-bootstrap/lib/Grid';
import Panel from 'react-bootstrap/lib/Panel';
import Row from 'react-bootstrap/lib/Row';
import { connect } from 'store/store.js';

/* eslint react/prop-types: 0 */
const Footer = ({ topBar }) => {
  if (topBar === 'default') {
    return null;
  }
  return (
    <Panel.Footer style={{ marginTop: '20px', marginBottom: '0px', paddingLeft: '20px', fontSize: '0.90em' }}>
      <Grid fluid={true}>
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
      </Grid>
    </Panel.Footer>
  );
};

export default connect(({ settings }) => ({
  topBar: settings.topBar
}))(Footer);
