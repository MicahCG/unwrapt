

// Development-only authentication helper with improved security
export const triggerDevAuth = () => {
  // More restrictive environment check
  if (process.env.NODE_ENV !== 'development') {
    console.warn('🔒 Dev auth is only available in development mode');
    return;
  }

  // Additional check for localhost
  if (!window.location.hostname.includes('localhost') && 
      !window.location.hostname.includes('127.0.0.1') &&
      !window.location.hostname.includes('preview--')) {
    console.warn('🔒 Dev auth blocked: not running on localhost or preview');
    return;
  }

  // Rate limiting for dev auth
  const lastDevAuth = localStorage.getItem('last-dev-auth');
  const now = Date.now();
  
  if (lastDevAuth && (now - parseInt(lastDevAuth)) < 5000) {
    console.warn('🔒 Dev auth rate limited: please wait 5 seconds between attempts');
    return;
  }

  localStorage.setItem('last-dev-auth', now.toString());

  const fakeUser = {
    id: '00000000-0000-0000-0000-000000000001', // Proper UUID format for dev user
    email: 'dev@example.com',
    user_metadata: {
      name: 'Dev User',
      avatar_url: null,
      full_name: 'Dev User'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const fakeSession = {
    user: fakeUser,
    access_token: 'fake-token-dev-2024',
    refresh_token: 'fake-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer'
  };

  // Dispatch the fake auth event
  window.dispatchEvent(new CustomEvent('fake-auth', {
    detail: {
      user: fakeUser,
      session: fakeSession
    }
  }));

  console.log('✅ Fake auth triggered with proper UUID:', fakeUser.id);
  console.log('📧 Dev user email:', fakeUser.email);
  console.log('⏰ Session expires at:', new Date(fakeSession.expires_at * 1000).toLocaleString());
};

// Add to window for easy access in development with additional security
if (process.env.NODE_ENV === 'development') {
  // Only expose if we're in a safe environment
  if (window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.includes('preview--')) {
    (window as any).triggerDevAuth = triggerDevAuth;
    console.log('🔧 Dev mode: triggerDevAuth() available on window (rate limited)');
  }
}

