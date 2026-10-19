import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/base44Client';
import { normalizeDisplayName } from '@/lib/displayName';
import DisplayNameDialog from '@/components/auth/DisplayNameDialog';
const AuthContext = createContext();

const LATER_KEY = 'mayhishpo:display-name-later';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // undefined = not loaded yet, null = the user has not chosen one
  const [displayName, setDisplayNameState] = useState(undefined);
  const [nameDialog, setNameDialog] = useState(null); // { reason: 'login' | 'action' }
  const pendingName = useRef(null); // resolves ensureDisplayName()

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
    });

    return () => subscription?.unsubscribe();
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setDisplayNameState(undefined);
      return undefined;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Loading the display name failed:', error);
        setDisplayNameState(data?.display_name || null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Users from before display names existed are asked once per session after signing in; "later" is allowed,
  // but commenting, suggesting and chatting ask again (ensureDisplayName).
  useEffect(() => {
    if (displayName !== null) return;
    let later = false;
    try {
      later = sessionStorage.getItem(LATER_KEY) === '1';
    } catch { /* ignore */ }
    if (!later) setNameDialog((d) => d || { reason: 'login' });
  }, [displayName]);

  /** Saves the signed-in user's display name (validated again by the server). */
  const setDisplayName = async (name) => {
    const { data, error } = await supabase.rpc('set_display_name', { p_name: normalizeDisplayName(name) });
    if (error) {
      throw new Error(error.hint === 'invalid_display_name' ? 'השם לא התקבל. יש לבחור שם אחר' : 'שמירת השם נכשלה. נסו שוב');
    }
    setDisplayNameState(data);
    return data;
  };

  /** Resolves true once the user has a display name, asking for one first if needed; false if they cancel. */
  const ensureDisplayName = useCallback(() => {
    if (displayName) return Promise.resolve(true);
    return new Promise((resolve) => {
      pendingName.current?.(false);
      pendingName.current = resolve;
      setNameDialog({ reason: 'action' });
    });
  }, [displayName]);

  const closeNameDialog = (saved) => {
    if (!saved && nameDialog?.reason === 'login') {
      try {
        sessionStorage.setItem(LATER_KEY, '1');
      } catch { /* ignore */ }
    }
    setNameDialog(null);
    pendingName.current?.(saved);
    pendingName.current = null;
  };

  const signUp = async (email, password, captchaToken, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          captchaToken,
          // proof of consent: when, and to which version of the terms
          // display_name is copied into profiles by the signup trigger (migration 031)
          data: { terms_accepted_at: new Date().toISOString(), terms_version: '2026-10', display_name: normalizeDisplayName(name) }
        }
      });

      if (error) {
          throw new Error(error.message);
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email, password, captchaToken) => {
    try {

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('אימייל או סיסמה לא נכונים');
        }
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('אנא אשר את הדוא"ל שלך לפני התחברות');
        }
        throw error;
      }
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email, captchaToken) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user?.email) throw new Error('יש להתחבר מחדש');
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('הסיסמה הנוכחית שגויה');
    await updatePassword(newPassword);
  };

  const deleteAccount = async () => {
    // best effort: remove the images this user uploaded (storage rows cannot be deleted from SQL)
    try {
      const folder = `places/${user.id}`;
      const { data: files } = await supabase.storage.from('place-images').list(folder, { limit: 1000 });
      if (files?.length) {
        await supabase.storage.from('place-images').remove(files.map((f) => `${folder}/${f.name}`));
      }
    } catch { /* ignore: account deletion must not depend on it */ }

    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      if (error.message?.includes('last admin')) throw new Error('אי אפשר למחוק את חשבון המנהל האחרון');
      throw new Error('מחיקת החשבון נכשלה. נסה שוב או צור קשר.');
    }
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    changePassword,
    deleteAccount,
    displayName: displayName || '',
    setDisplayName,
    ensureDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {nameDialog && user && (
        <DisplayNameDialog reason={nameDialog.reason} onSave={setDisplayName} onClose={closeNameDialog} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/** The signed-in user's display name, or '' (also outside AuthProvider, e.g. in component tests). */
export const useDisplayName = () => useContext(AuthContext)?.displayName || '';
