
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure we're using clean URLs by removing any hash fragments
if (window.location.hash && window.location.hash !== '#') {
  const hashPath = window.location.hash.slice(1);
  const newUrl = window.location.origin + hashPath;
  window.history.replaceState(null, '', newUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
