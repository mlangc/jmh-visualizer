import App from 'components/App.jsx';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Provider } from 'store/store.js';

import 'bootstrap/dist/css/bootstrap.css';
import '../css/common.css';
import '../css/sidenavi.css';

// Mount synchronously, like ReactDOM.render did: store.js kicks off the initial
// benchmark load in a setTimeout, and react-waterfall drops actions dispatched
// before <Provider> has mounted.
const root = createRoot(document.getElementById('main'));
flushSync(() =>
  root.render(
    <Provider>
      <App />
    </Provider>
  )
);
