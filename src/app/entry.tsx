import App from 'components/App.tsx';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.css';
import '../css/common.css';
import '../css/sidenavi.css';

createRoot(document.getElementById('main')!).render(<App />);
