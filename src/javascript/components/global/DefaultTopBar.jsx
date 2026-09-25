import AppLogo from 'components/AppLogo.jsx';
import DoingWorkSpinner from 'components/DoingWorkSpinner.jsx';
import { LinkIcon } from 'components/Icons.jsx';
import React from 'react';
import Container from 'react-bootstrap/Container';
import Dropdown from 'react-bootstrap/Dropdown';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

export default class DefaultTopBar extends React.Component {
  onReset() {
    window.onbeforeunload = null;
    window.location = window.location.href.split('#')[0].split('?')[0];
  }

  render() {
    const aboutPopover = (
      <Popover id="popover-trigger-click-root-close">
        <Popover.Header as="h3">{`About JMH Visualizer - ${process.env.version}`}</Popover.Header>
        <Popover.Body>
          <p>
            <i>JMH Visualizer</i> will render charts out of your{' '}
            <a href="http://openjdk.java.net/projects/code-tools/jmh/" target="_blank" rel="noopener noreferrer">
              JMH Benchmarks
            </a>
            . All it needs are your benchmark results in JSON format.
          </p>
        </Popover.Body>
      </Popover>
    );

    const showReset = providedBenchmarks.length === 0;

    return (
      <Navbar bg="dark" data-bs-theme="dark" style={{ marginBottom: '0px' }}>
        <Container fluid className="justify-content-start">
          <Navbar.Brand>
            <Dropdown id="logo-dropdown">
              <Dropdown.Toggle as={AppLogo} id="logo-dropdown-toggle" />
              <Dropdown.Menu data-bs-theme="light">
                {showReset > 0 && (
                  <Dropdown.Item role="menuitem" onClick={this.onReset}>
                    {' '}
                    Reset & Upload New
                  </Dropdown.Item>
                )}
                {showReset > 0 && <Dropdown.Divider />}
                <Dropdown.Item
                  role="menuitem"
                  href="https://github.com/jzillmann/jmh-visualizer/issues"
                  target="_blank"
                >
                  <LinkIcon />
                  {' Feedback & Bug Reports '}
                </Dropdown.Item>
                <Dropdown.Item role="menuitem" href="http://github.com/jzillmann/jmh-visualizer" target="_blank">
                  <LinkIcon />
                  {' Code @ Github '}
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item role="menuitem" href="http://openjdk.java.net/projects/code-tools/jmh/" target="_blank">
                  <LinkIcon />
                  {' JMH '}
                </Dropdown.Item>
                <Dropdown.Item
                  role="menuitem"
                  href="http://hg.openjdk.java.net/code-tools/jmh/file/tip/jmh-samples/src/main/java/org/openjdk/jmh/samples/"
                  target="_blank"
                >
                  <LinkIcon />
                  {' JMH Samples'}
                </Dropdown.Item>
                <Dropdown.Divider />
                <OverlayTrigger trigger="click" rootClose placement="bottom" overlay={aboutPopover}>
                  <Dropdown.Item role="menuitem" onClick={(e) => e.stopPropagation()}>
                    {' '}
                    About
                  </Dropdown.Item>
                </OverlayTrigger>
              </Dropdown.Menu>
            </Dropdown>
          </Navbar.Brand>
          <Nav>
            <Nav.Link as="div">
              <DoingWorkSpinner />
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    );
  }
}
