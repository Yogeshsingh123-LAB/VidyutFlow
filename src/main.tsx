// Initialize light theme before render to eliminate FOUC and enforce strict CSP (no inline script)
try {
  localStorage.setItem('vidyutone_theme', 'light');
  document.documentElement.classList.remove('dark');
} catch {
  // Storage unavailable
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupFieldServiceWorker} from './utils/serviceWorkerRegistration';

setupFieldServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
