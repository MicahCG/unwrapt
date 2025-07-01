

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ErrorHandler } from '@/utils/errorHandler';
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter';

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
      setUser(session?.user ?? null);
      setLoading(false);
      
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
      // Rate limiting check
      const rateLimitKey = `google-signin-${window.location.hostname}`;
      if (!rateLimiter.isAllowed(rateLimitKey, RATE_LIMITS.AUTH_ATTEMPTS)) {
        const resetTime = rateLimiter.getResetTime(rateLimitKey, RATE_LIMITS.AUTH_ATTEMPTS);
        const waitTime = Math.ceil((resetTime - Date.now()) / 1000 / 60);
        throw new Error(`Too many sign-in attempts. Please wait ${waitTime} minutes.`);
      }

      console.log('🔧 AuthProvider: Starting Google sign in');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        console.error('🔧 AuthProvider: Error signing in with Google:', error);
        throw error;
      }
    } catch (error: any) {
      const friendlyMessage = ErrorHandler.handleAuthError(error, user?.id);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔧 AuthProvider: Signing out');
      
      // Clear fake user state first
      if (process.env.NODE_ENV === 'development') {
        setUser(null);
        // Clear dev auth rate limiting
        localStorage.removeItem('last-dev-auth');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔧 AuthProvider: Error signing out:', error);
        throw error;
      }
    } catch (error: any) {
      const friendlyMessage = ErrorHandler.handleAuthError(error, user?.id);
      console.error('Sign out error:', friendlyMessage);
      // Don't throw on sign out errors, just log them
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

