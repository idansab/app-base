import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  return (
    <div className={`sticky top-0 ${isDark ? 'bg-card border-border' : 'bg-white border-gray-200'} border-b z-30 py-3`}>
      <div className="px-4 max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo - Clickable to go home */}
        <button
          onClick={() => navigate('/')}
          className="text-right font-bold text-2xl text-primary hover:opacity-80 transition-opacity cursor-pointer"
          title="חזור לבית"
        >
          מה יש פה?
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate(isAuthenticated ? '/contribute' : '/login')}
            className="p-2 bg-primary hover:bg-primary/90 text-white rounded-full transition-all hover:scale-110 shadow-md"
            title="הוסף מקום"
            aria-label="הוסף מקום"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`p-2 rounded-full transition-colors ${
              isDark
                ? 'hover:bg-secondary text-primary'
                : 'hover:bg-sand text-primary'
            }`}
            title="הגדרות"
            aria-label="הגדרות"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
