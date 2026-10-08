import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { useTheme } from '@/lib/ThemeContext';

export default function AppLayout() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <Header />

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
