
// Development-only authentication helper
export const triggerDevAuth = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev auth is only available in development mode');
    return;
  }

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
};

// Add to window for easy access in development
if (process.env.NODE_ENV === 'development') {
  (window as any).triggerDevAuth = triggerDevAuth;
  console.log('🔧 Dev mode: triggerDevAuth() available on window');
}
