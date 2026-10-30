import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupFieldServiceWorker} from './utils/serviceWorkerRegistration';

setupFieldServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
