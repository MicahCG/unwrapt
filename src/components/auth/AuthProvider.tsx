import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ErrorHandler } from '@/utils/errorHandler';
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter';
import { NATIVE_AUTH_CALLBACK, isNativeApp } from '@/lib/native';
import { openExternalAuthUrl } from '@/lib/nativeBootstrap';
import { logoutIapUser } from '@/lib/iap';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    console.log('🔧 AuthProvider: Setting up auth state management');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('🔧 AuthProvider: Error getting initial session:', error);
        ErrorHandler.handleAuthError(error);
      }
      
      console.log('🔧 AuthProvider: Initial session check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id 
      });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔧 AuthProvider: Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        currentPath: window.location.pathname,
        searchParams: window.location.search 
      });
      
      // Handle rate limiting - synchronous only
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('🔧 AuthProvider: Token refresh failed, possible rate limit');
        setIsRateLimited(true);
        // Reset rate limit flag after 1 minute
        setTimeout(() => {
          console.log('🔧 AuthProvider: Rate limit cooldown complete');
          setIsRateLimited(false);
        }, 60000);
        return;
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Clear rate limit flag on successful auth
      if (session?.user) {
        setIsRateLimited(false);
      }
      
      // Clean up URL only after successful authentication and only if safe to do so
      if (event === 'SIGNED_IN' && window.location.hash && window.location.hash.includes('access_token')) {
        console.log('🔧 AuthProvider: Cleaning OAuth hash after successful sign in');
        // Use setTimeout to avoid history manipulation errors
        setTimeout(() => {
          try {
            const cleanPath = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', cleanPath);
          } catch (error) {
            console.error('🔧 AuthProvider: Error cleaning URL after auth:', error);
            ErrorHandler.logError({
              code: 'URL_CLEANUP_ERROR',
              message: 'Failed to clean URL after authentication',
              details: error,
              severity: 'low',
              timestamp: new Date().toISOString()
            });
          }
        }, 100);
      }
    });

    // Listen for fake auth events (development only)
    const handleFakeAuth = (event: CustomEvent) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 AuthProvider: Fake auth triggered:', event.detail);
        setUser(event.detail.user as User);
        setLoading(false);
      }
    };

    window.addEventListener('fake-auth', handleFakeAuth as EventListener);

    return () => {
      console.log('🔧 AuthProvider: Cleaning up auth listeners');
      subscription.unsubscribe();
      window.removeEventListener('fake-auth', handleFakeAuth as EventListener);
    };
  }, []);

  // Log user state changes
  useEffect(() => {
    console.log('🔧 AuthProvider: User state updated:', { 
      hasUser: !!user, 
      userId: user?.id,
      email: user?.email,
      loading 
    });
  }, [user, loading]);

  const signInWithGoogle = async () => {
    try {
      // Check if currently rate limited
      if (isRateLimited) {
        throw new Error('Please wait a moment before signing in again. Too many authentication attempts.');
      }
      
      // Rate limiting check
      const rateLimitKey = `google-signin-${window.location.hostname}`;
      if (!rateLimiter.isAllowed(rateLimitKey, RATE_LIMITS.AUTH_ATTEMPTS)) {
        const resetTime = rateLimiter.getResetTime(rateLimitKey, RATE_LIMITS.AUTH_ATTEMPTS);
        const waitTime = Math.ceil((resetTime - Date.now()) / 1000 / 60);
        throw new Error(`Too many sign-in attempts. Please wait ${waitTime} minutes.`);
      }

      console.log('🔧 AuthProvider: Starting Google sign in');

      // The iOS app returns through its own URL scheme so sign-in lands back in the app.
      let redirectUrl: string;
      if (isNativeApp()) {
        redirectUrl = NATIVE_AUTH_CALLBACK;
      } else if (window.location.hostname === 'localhost') {
        redirectUrl = `http://localhost:${window.location.port || '8080'}/`;
      } else if (window.location.hostname === 'unwrapt.io') {
        redirectUrl = 'https://app.unwrapt.io/';
      } else {
        redirectUrl = `${window.location.origin}/`;
      }

      console.log('🔧 AuthProvider: OAuth redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNativeApp(),
        },
      });

      if (error) {
        console.error('🔧 AuthProvider: Error signing in with Google:', error);
        if (error.message?.includes('rate limit') || error.status === 429) {
          setIsRateLimited(true);
          setTimeout(() => setIsRateLimited(false), 60000);
          throw new Error('Too many authentication attempts. Please wait a minute and try again.');
        }
        throw error;
      }

      if (isNativeApp() && data?.url) {
        await openExternalAuthUrl(data.url);
      }
    } catch (error: any) {
      const friendlyMessage = ErrorHandler.handleAuthError(error, user?.id);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    console.log('🔧 AuthProvider: Signing out');

    if (process.env.NODE_ENV === 'development') {
      // Clear dev auth rate limiting
      localStorage.removeItem('last-dev-auth');
    }

    // supabase-js can fail to clear the stored session when the server
    // rejects an already-stale access token (throws AuthSessionMissingError
    // instead of falling through to remove the local session - seen for
    // real in testing). Force-clear it directly, synchronously, so the user
    // isn't stuck "signed in" with a UI that still has their data on screen.
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
        .forEach((key) => localStorage.removeItem(key));
    } catch (storageError) {
      console.error('🔧 AuthProvider: Could not clear local session storage:', storageError);
    }
    setUser(null);
    void logoutIapUser();

    // Don't await the network round trip (it's what was causing Sign out to
    // appear to do nothing until the user also hit "Done" - the call can
    // hang or error for several seconds on an already-stale session). Local
    // state and storage are already cleared above, so this is best-effort.
    supabase.auth.signOut({ scope: 'local' }).catch((error) => {
      console.error('🔧 AuthProvider: Error signing out (non-blocking):', error);
    });

    // The SDK's background auto-refresh timer lives on the in-memory
    // GoTrueClient instance and keeps running even after we clear storage
    // out from under it, silently restoring the session a tick later. A
    // hard reload throws away that instance so the fresh one on reload
    // starts from the now-empty storage with nothing to refresh.
    window.location.href = '/';
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

