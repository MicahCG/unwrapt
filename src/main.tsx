
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Comprehensive URL cleanup to ensure clean browser routing
const cleanupUrl = () => {
  const currentUrl = window.location.href;
  
  // Handle hash-based URLs
  if (window.location.hash && window.location.hash !== '#') {
    const hashPath = window.location.hash.slice(1);
    const newUrl = window.location.origin + hashPath;
    console.log('🔧 URL Cleanup: Removing hash from URL:', currentUrl, '->', newUrl);
    window.history.replaceState(null, '', newUrl);
    return;
  }
  
  // Handle preview URLs with staging domains
  if (currentUrl.includes('preview--') && window.location.hash === '#') {
    const cleanUrl = window.location.origin + window.location.pathname;
    console.log('🔧 URL Cleanup: Cleaning preview URL:', currentUrl, '->', cleanUrl);
    window.history.replaceState(null, '', cleanUrl);
    return;
  }
};

// Clean up URL immediately
cleanupUrl();

// Also clean up after DOM is ready
document.addEventListener('DOMContentLoaded', cleanupUrl);

createRoot(document.getElementById("root")!).render(<App />);
