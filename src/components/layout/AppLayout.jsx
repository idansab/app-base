import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header with Settings */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-end">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-sand rounded-full transition-colors"
            title="הגדרות"
            aria-label="הגדרות"
          >
            <Settings size={24} className="text-primary" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
