import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error('🔴 Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsAuthenticated(!!session?.user);
      console.log('✅ Auth state changed:', event, session?.user?.email);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    try {
      console.log('🔄 Signing up with:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) {
        console.error('❌ Signup error:', error.code, error.message);
        throw new Error(error.message);
      }

      console.log('✅ Signup successful:', data.user?.email);
      return data;
    } catch (error) {
      console.error('❌ Signup failed:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('🔄 Signing in with:', email);
      console.log('📍 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('❌ Login error:', error.code, error.message);
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('אימייל או סיסמה לא נכונים');
        }
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('אנא אשר את הדוא"ל שלך לפני התחברות');
        }
        throw error;
      }

      console.log('✅ Login successful:', data.user?.email);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ Logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
