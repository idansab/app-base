import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
