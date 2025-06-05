
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Improved URL cleanup to handle OAuth callbacks safely
const cleanupUrl = () => {
  const currentUrl = window.location.href;
  const hasAccessToken = currentUrl.includes('access_token=');
  const hasCode = currentUrl.includes('code=');
  
  // Don't clean up OAuth callback URLs - let the OAuth components handle them
  if (hasAccessToken || hasCode) {
    console.log('🔧 URL Cleanup: OAuth callback detected, skipping cleanup');
    return;
  }
  
  // Handle hash-based URLs (but not OAuth tokens)
  if (window.location.hash && window.location.hash !== '#' && !hasAccessToken) {
    const hashPath = window.location.hash.slice(1);
    
    // Only clean if it's a valid path, not an OAuth fragment
    if (hashPath.startsWith('/') && !hashPath.includes('=')) {
      try {
        const newUrl = window.location.origin + hashPath;
        console.log('🔧 URL Cleanup: Removing hash from URL:', currentUrl, '->', newUrl);
        window.history.replaceState(null, '', newUrl);
      } catch (error) {
        console.error('🔧 URL Cleanup: Failed to clean hash URL:', error);
      }
    }
    return;
  }
  
  // Handle preview URLs with staging domains (but not OAuth callbacks)
  if (currentUrl.includes('preview--') && window.location.hash === '#' && !hasAccessToken && !hasCode) {
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      console.log('🔧 URL Cleanup: Cleaning preview URL:', currentUrl, '->', cleanUrl);
      window.history.replaceState(null, '', cleanUrl);
    } catch (error) {
      console.error('🔧 URL Cleanup: Failed to clean preview URL:', error);
    }
    return;
  }
};

// Clean up URL immediately, but safely
try {
  cleanupUrl();
} catch (error) {
  console.error('🔧 URL Cleanup: Error during initial cleanup:', error);
}

// Also clean up after DOM is ready, but safely
document.addEventListener('DOMContentLoaded', () => {
  try {
    cleanupUrl();
  } catch (error) {
    console.error('🔧 URL Cleanup: Error during DOM ready cleanup:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
