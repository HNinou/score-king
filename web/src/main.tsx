import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { codeFromHash } from './sync/live';
import { App } from './ui/App';
import { SpectatorApp } from './ui/spectator';

const root = document.getElementById('root');
const watchCode = codeFromHash(window.location.hash);
if (root) {
  createRoot(root).render(
    <StrictMode>
      {watchCode ? <SpectatorApp code={watchCode} /> : <App />}
    </StrictMode>,
  );
}
