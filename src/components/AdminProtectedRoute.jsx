import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';

/**
 * UX gate only. The real protection is server-side: every admin write goes
 * through Postgres RLS policies that call public.is_admin(). Nothing here is
 * stored in localStorage, so there is no client-side flag to forge.
 */
export default function AdminProtectedRoute() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      try {
        // getUser() validates the JWT against the auth server (getSession() does not)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        let admin = false;
        const { data: rpcResult, error: rpcError } = await supabase.rpc('is_admin');
        if (!rpcError) {
          admin = rpcResult === true;
        } else {
          // is_admin() not deployed yet (migration 005): fall back to own profile row
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          admin = profile?.role === 'admin';
        }
        if (!cancelled) setIsAdmin(admin);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setIsAdmin(false);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
