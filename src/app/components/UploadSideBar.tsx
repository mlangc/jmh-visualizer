import LoadFromGistsDialog from 'components/LoadFromGistsDialog.tsx';
import LoadFromUrlsDialog from 'components/LoadFromUrlsDialog.tsx';
import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { FaRegHandPointRight as PointingHandIcon } from 'react-icons/fa';
import { actions } from 'store/store.ts';

export default function UploadSideBar() {
  const [urlDialogVisible, setUrlDialogVisible] = useState(false);
  const [gistDialogVisible, setGistDialogVisible] = useState(false);

  const showUrlDialog = () => setUrlDialogVisible(true);
  const hideUrlDialog = () => setUrlDialogVisible(false);
  const showGistDialog = () => setGistDialogVisible(true);
  const hideGistDialog = () => setGistDialogVisible(false);

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
        <PointingHandIcon /> <a onClick={showUrlDialog}>Load from URL(s)</a>
      </div>
      <div>
        <PointingHandIcon /> <a onClick={showGistDialog}>Load from Gist(s)</a>
      </div>
      <br />
      <Modal show={urlDialogVisible} onHide={hideUrlDialog}>
        <Modal.Header closeButton>
          <Modal.Title>Load JMH benchmarks from external URL(s)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LoadFromUrlsDialog />
        </Modal.Body>
      </Modal>
      <Modal show={gistDialogVisible} onHide={hideGistDialog}>
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
