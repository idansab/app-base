import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Home, Heart, Map, Lightbulb, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AppLayout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'גילוי' },
    { path: '/favorites', icon: Heart, label: 'מועדפים' },
    { path: '/trips', icon: Map, label: 'מסלולים' },
    { path: '/surprise', icon: Lightbulb, label: 'הפתעה' },
    { path: '/admin', icon: Settings, label: 'ניהול' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Outlet />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2 justify-center">
        <div className="flex gap-2 max-w-md">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-2xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-20" />
    </div>
  );
}
