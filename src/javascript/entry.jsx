import App from 'components/App.jsx';
import ReactDOM from 'react-dom';
import { Provider } from 'store/store.js';

import 'bootstrap/dist/css/bootstrap.css';
import '../css/common.css';
import '../css/sidenavi.css';

ReactDOM.render(
  <Provider>
    <App />
  </Provider>,
  document.getElementById('main')
);
