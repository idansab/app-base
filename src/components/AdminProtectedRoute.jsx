import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';

export default function AdminProtectedRoute() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const adminId = localStorage.getItem('admin_id');

        if (!token || !adminId) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Verify token and admin status with Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user || user.id !== adminId) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_id');
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id);

        if (profileError || !profiles || profiles.length === 0 || profiles[0].role !== 'admin') {
          console.error('Admin profile check failed:', { profileError, profiles });
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_id');
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error('Admin check error:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
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
