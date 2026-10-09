import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/base44Client';
import Dashboard from '@/components/admin/Dashboard';
import PlacesManager from '@/components/admin/places/PlacesManager';
import ModerationQueue from '@/components/admin/ModerationQueue';
import UsersManager from '@/components/admin/UsersManager';
import AuditLog from '@/components/admin/AuditLog';

const TABS = [
  ['dashboard', 'לוח בקרה'],
  ['approval', 'אישור מקומות'],
  ['places', 'ניהול מקומות'],
  ['moderation', 'טיפים ודיווחים'],
  ['users', 'משתמשים'],
  ['audit', 'יומן פעולות'],
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingCounts, setPendingCounts] = useState({ places: 0, content: 0 });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [message, setMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id ?? null));
  }, []);

  // Stable identities: child components use these as effect dependencies
  const showSuccess = useCallback((text) => {
    setMessage({ text, isError: false });
    setTimeout(() => setMessage({ text: '', isError: false }), 3000);
  }, []);

  const showError = useCallback((text) => {
    setMessage({ text, isError: true });
    setTimeout(() => setMessage({ text: '', isError: false }), 5000);
  }, []);

  const setPendingPlaces = useCallback(
    (places) => setPendingCounts((counts) => (counts.places === places ? counts : { ...counts, places })),
    []
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Tab navigation */}
      <div className="sticky top-0 bg-card border-b border-border z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4 justify-between items-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
            aria-label="התנתק"
          >
            <LogOut size={18} />
            <span>התנתק</span>
          </button>
          <div className="flex flex-wrap gap-2 justify-end" role="tablist">
            {TABS.map(([key, label]) => {
              const badge = key === 'approval' ? pendingCounts.places : key === 'moderation' ? pendingCounts.content : 0;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-green-600 text-white'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {label}
                  {badge > 0 && (
                    <span
                      className="mr-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white"
                      aria-label={`${badge} ממתינים`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {message.text && (
        <div
          role={message.isError ? 'alert' : 'status'}
          className={`fixed top-24 right-4 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl shadow-md border animate-in ${
            message.isError
              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800'
          }`}
        >
          {message.isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} onCounts={setPendingCounts} />}

        {activeTab === 'approval' && (
          <PlacesManager
            key="approval"
            title="אישור מקומות"
            initialStatus="pending"
            onPendingChange={setPendingPlaces}
            onError={showError}
            onSuccess={showSuccess}
          />
        )}

        {activeTab === 'places' && (
          <PlacesManager
            key="places"
            title="ניהול מקומות"
            onPendingChange={setPendingPlaces}
            onError={showError}
            onSuccess={showSuccess}
          />
        )}

        {activeTab === 'moderation' && <ModerationQueue onError={showError} onSuccess={showSuccess} />}

        {activeTab === 'users' && (
          <UsersManager currentUserId={currentUserId} onError={showError} onSuccess={showSuccess} />
        )}

        {activeTab === 'audit' && <AuditLog onError={showError} />}
      </div>
    </div>
  );
}
