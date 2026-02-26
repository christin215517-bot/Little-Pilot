import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill process for the browser to prevent runtime errors from libraries expecting it
if (typeof window !== 'undefined' && !window.process) {
  window.process = {
    env: {
      NODE_ENV: 'development',
    },
    version: '',
    nextTick: (cb: Function) => setTimeout(cb, 0),
  } as any;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
