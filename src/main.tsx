
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any hash from the URL on initial load
if (window.location.hash) {
  const hash = window.location.hash.slice(1);
  const cleanPath = hash || '/';
  window.history.replaceState(null, '', cleanPath);
}

createRoot(document.getElementById("root")!).render(<App />);
