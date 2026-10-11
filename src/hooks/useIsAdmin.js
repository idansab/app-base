import { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/** True only for signed-in admins. UI hint only; real protection is server-side (is_admin() + RLS). */
export default function useIsAdmin() {
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setIsAdmin(false);
      return undefined;
    }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!cancelled) setIsAdmin(!error && data === true);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  return isAdmin;
}
