
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      
      // Clean up any hash-based URLs after auth state changes
      if (window.location.hash && window.location.hash !== '#') {
        const cleanPath = window.location.pathname + window.location.search;
        console.log('🔧 AuthProvider: Cleaning URL after auth change:', window.location.href, '->', cleanPath);
        window.history.replaceState(null, '', cleanPath);
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
    console.log('🔧 AuthProvider: Starting Google sign in');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      console.error('🔧 AuthProvider: Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    console.log('🔧 AuthProvider: Signing out');
    // Clear fake user state
    if (process.env.NODE_ENV === 'development') {
      setUser(null);
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('🔧 AuthProvider: Error signing out:', error);
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
