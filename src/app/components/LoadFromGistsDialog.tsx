import React, { type ChangeEvent } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

interface LoadFromGistsDialogState {
  gist1: string;
  gist2: string;
}

export default class LoadFromGistsDialog extends React.Component<object, LoadFromGistsDialogState> {
  constructor(props: object, context: unknown) {
    super(props, context);
    this.state = {
      gist1: '',
      gist2: ''
    };
    this.handleGist1Change = this.handleGist1Change.bind(this);
    this.handleGist2Change = this.handleGist2Change.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleGist1Change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    this.setState({
      gist1: event.target.value
    });
  }

  handleGist2Change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    this.setState({
      gist2: event.target.value
    });
  }

  handleSubmit() {
    const params = new URLSearchParams(window.location.search);
    params.delete('source');
    params.delete('sources');
    params.delete('gist');
    params.delete('gists');

    if (this.state.gist2) {
      params.set('gists', `${this.state.gist1},${this.state.gist2}`);
    } else {
      params.set('gist', this.state.gist1);
    }

    window.location.search = decodeURIComponent(params.toString());
  }

  render() {
    return (
      <Form>
        <Form.Group as={Row} controlId="gist1">
          <Form.Label column sm={2}>
            {' '}
            Gist 1
          </Form.Label>
          <Col sm={10}>
            <Form.Control type="text" onChange={this.handleGist1Change} />
          </Col>
        </Form.Group>
        <Form.Group as={Row} controlId="gist2">
          <Form.Label column sm={2}>
            {' '}
            Gist 2 (optional)
          </Form.Label>
          <Col sm={10}>
            <Form.Control type="text" onChange={this.handleGist2Change} />
          </Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Col sm={{ span: 10, offset: 2 }}>
            <Button variant="outline-secondary" onClick={this.handleSubmit} disabled={!this.state.gist1}>
              Load
            </Button>
          </Col>
        </Form.Group>
      </Form>
    );
  }
}
