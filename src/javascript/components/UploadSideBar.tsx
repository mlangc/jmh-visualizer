import LoadFromGistsDialog from 'components/LoadFromGistsDialog.tsx';
import LoadFromUrlsDialog from 'components/LoadFromUrlsDialog.tsx';
import React from 'react';
import Modal from 'react-bootstrap/Modal';
import { FaRegHandPointRight as PointingHandIcon } from 'react-icons/fa';
import { actions } from 'store/store.ts';

interface UploadSideBarState {
  urlDialogVisible: boolean;
  gistDialogVisible: boolean;
}

//Sidebar for the upload view
export default class UploadSideBar extends React.Component<object, UploadSideBarState> {
  constructor(props: object, context: unknown) {
    super(props, context);

    this.state = {
      urlDialogVisible: false,
      gistDialogVisible: false
    };

    this.showUrlDialog = this.showUrlDialog.bind(this);
    this.hideUrlDialog = this.hideUrlDialog.bind(this);
    this.showGistDialog = this.showGistDialog.bind(this);
    this.hideGistDialog = this.hideGistDialog.bind(this);
  }

  showUrlDialog() {
    this.setState({
      urlDialogVisible: true
    });
  }

  hideUrlDialog() {
    this.setState({
      urlDialogVisible: false
    });
  }

  showGistDialog() {
    this.setState({
      gistDialogVisible: true
    });
  }

  hideGistDialog() {
    this.setState({
      gistDialogVisible: false
    });
  }

  render() {
    return (
      <div style={{ whiteSpace: 'nowrap' }}>
        <div>
          <div className="btn btn-outline-secondary" style={{ position: 'relative' }}>
            Open File Dialog
            <input
              type="file"
              multiple
              accept=".json"
              onChange={(event) => {
                actions.uploadFiles([...event.target.files!]);
              }}
              style={{ opacity: 0.0, position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
            />
          </div>
        </div>
        <br />
        <div>
          <PointingHandIcon /> <a onClick={actions.loadSingleRunExample}>Load Single Run Example</a>
        </div>
        <div>
          <PointingHandIcon /> <a onClick={actions.loadTwoRunsExample}>Load Two Runs Example</a>
        </div>
        <div>
          <PointingHandIcon /> <a onClick={actions.loadMultiRunExample}>Load Multi Run Example</a>
        </div>
        <hr />
        <div>
          <PointingHandIcon /> <a onClick={this.showUrlDialog}>Load from URL(s)</a>
        </div>
        <div>
          <PointingHandIcon /> <a onClick={this.showGistDialog}>Load from Gist(s)</a>
        </div>
        <br />
        <Modal show={this.state.urlDialogVisible} onHide={this.hideUrlDialog}>
          <Modal.Header closeButton>
            <Modal.Title>Load JMH benchmarks from external URL(s)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <LoadFromUrlsDialog />
          </Modal.Body>
        </Modal>
        <Modal show={this.state.gistDialogVisible} onHide={this.hideGistDialog}>
          <Modal.Header closeButton>
            <Modal.Title>Load JMH benchmarks from external Gist(s)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <LoadFromGistsDialog />
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}
