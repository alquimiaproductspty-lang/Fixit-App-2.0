import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clean up pre-hydration background marker
const staticSplash = document.getElementById('initial-splash');
if (staticSplash) {
  staticSplash.remove();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
