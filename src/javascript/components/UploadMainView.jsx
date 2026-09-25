import { blue, green } from 'functions/colors.ts';
import Alert from 'react-bootstrap/Alert';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt as UploadIcon } from 'react-icons/fa';
import { actions } from 'store/store.ts';

const style = {
  width: '100%',
  height: '81vh',
  borderWidth: 1,
  borderColor: blue,
  borderStyle: 'dashed',
  borderRadius: 25,
  padding: 20,
  textAlign: 'center',
  verticalAlign: 'middle'
};

const dragActiveStyle = { ...style, borderColor: green, borderWidth: 3, borderStyle: 'dotted' };

// Dopzone for JSON files to upload
export default function UploadMainView() {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: (files) => actions.uploadFiles(files),
    onDropRejected: () => alert('Only drop valid JSON files!'),
    multiple: true,
    // By file extension alone, not MIME type
    validator: (file) =>
      file.name?.toLowerCase().endsWith('.json') ? null : { code: 'not-json', message: 'Not JSON' },
    noClick: true,
    noKeyboard: true,
    noPaste: true
  });

  return (
    <div {...getRootProps({ className: 'container-fluid', style: isDragActive ? dragActiveStyle : style })}>
      <input {...getInputProps()} />
      <div>
        <h1 style={{ marginBottom: 20 }}>Dropzone</h1>
        <h5>Drop your JMH JSON report file(s) here!</h5>
      </div>
      <h2>
        <UploadIcon size={100} />
      </h2>
      <br />
      <Alert variant="warning">
        <div>
          <blockquote style={{ fontSize: 14, paddingLeft: 0, marginBottom: 5 }}>
            <i>
              &quot;<a href="http://openjdk.java.net/projects/code-tools/jmh/">JMH</a> is a Java harness for building,
              running, and analysing nano/micro/milli/macro benchmarks written in Java and other languages targetting
              the JVM.&quot;
            </i>
          </blockquote>
          <div>
            Use this tool to visually explore your benchmark results! Simply upload<sup>*</sup> any JMH result files (in
            JSON format).
          </div>
        </div>
      </Alert>
      <br />
      <div style={{ fontSize: 12, textAlign: 'center' }}>
        * Your data stays locally in your browser, it is not send to any server!
      </div>
    </div>
  );
}
