import React, { type ChangeEvent } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

interface LoadFromUrlsDialogState {
  url1: string;
  url2: string;
}

export default class LoadFromUrlsDialog extends React.Component<object, LoadFromUrlsDialogState> {
  constructor(props: object, context: unknown) {
    super(props, context);
    this.state = {
      url1: '',
      url2: ''
    };
    this.handleUrl1Change = this.handleUrl1Change.bind(this);
    this.handleUrl2Change = this.handleUrl2Change.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleUrl1Change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    this.setState({
      url1: event.target.value
    });
  }

  handleUrl2Change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    this.setState({
      url2: event.target.value
    });
  }

  handleSubmit() {
    const params = new URLSearchParams(window.location.search);
    params.delete('source');
    params.delete('sources');
    params.delete('gist');
    params.delete('gists');

    if (this.state.url2) {
      params.set('sources', `${this.state.url1},${this.state.url2}`);
    } else {
      params.set('source', this.state.url1);
    }

    window.location.search = decodeURIComponent(params.toString());
  }

  render() {
    return (
      <Form>
        <Form.Group as={Row} controlId="url1">
          <Form.Label column sm={2}>
            {' '}
            URL 1
          </Form.Label>
          <Col sm={10}>
            <Form.Control type="text" onChange={this.handleUrl1Change} />
          </Col>
        </Form.Group>
        <Form.Group as={Row} controlId="url2">
          <Form.Label column sm={2}>
            {' '}
            URL 2 (optional)
          </Form.Label>
          <Col sm={10}>
            <Form.Control type="text" onChange={this.handleUrl2Change} />
          </Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Col sm={{ span: 10, offset: 2 }}>
            <Button variant="outline-secondary" onClick={this.handleSubmit} disabled={!this.state.url1}>
              Load
            </Button>
          </Col>
        </Form.Group>
      </Form>
    );
  }
}
