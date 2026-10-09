import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, ShieldOff, Search } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import ConfirmDialog from '@/components/ConfirmDialog';

/**
 * Lists users through the admin_list_users() RPC and changes roles through
 * admin_set_user_role(). Both functions re-check is_admin() on the server and
 * the second refuses to change the caller's own role (no accidental lockout).
 */
export default function UsersManager({ currentUserId, onError, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null); // { user, newRole }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to load users:', e);
      onError?.('שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => (u.email || '').toLowerCase().includes(q)) : users;
  }, [users, query]);

  const confirmRoleChange = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        target: pending.user.id,
        new_role: pending.newRole,
      });
      if (error) throw error;
      onSuccess?.('ההרשאה עודכנה');
      setPending(null);
      load();
    } catch (e) {
      console.error('Role change failed:', e);
      onError?.('שגיאה בעדכון ההרשאה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="relative mb-6">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי אימייל..."
          aria-label="חיפוש משתמשים"
          className="w-full pr-10 pl-4 py-2 border border-border rounded-2xl bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((u) => {
            const isSelf = u.id === currentUserId;
            const isAdmin = u.role === 'admin';
            return (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4"
              >
                <button
                  onClick={() => setPending({ user: u, newRole: isAdmin ? 'user' : 'admin' })}
                  disabled={isSelf}
                  title={isSelf ? 'לא ניתן לשנות את ההרשאה של עצמך' : undefined}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAdmin ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                  {isAdmin ? 'הסר מנהל' : 'הפוך למנהל'}
                </button>
                <div className="text-right min-w-0">
                  <p className="font-medium text-foreground truncate" dir="ltr">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'מנהל' : 'משתמש'} · נרשם {new Date(u.created_at).toLocaleDateString('he-IL')}
                    {u.last_sign_in_at
                      ? ` · כניסה אחרונה ${new Date(u.last_sign_in_at).toLocaleDateString('he-IL')}`
                      : ''}
                  </p>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="text-center py-8 text-muted-foreground">לא נמצאו משתמשים</li>
          )}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!pending}
        title="שינוי הרשאה"
        message={
          pending
            ? pending.newRole === 'admin'
              ? `להפוך את ${pending.user.email} למנהל? תהיה לו גישה מלאה לניהול האתר.`
              : `להסיר את הרשאות הניהול של ${pending.user.email}?`
            : ''
        }
        variant={pending?.newRole === 'admin' ? 'warning' : 'info'}
        confirmText="אישור"
        cancelText="ביטול"
        isLoading={saving}
        onConfirm={confirmRoleChange}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
