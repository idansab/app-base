import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Plus, Settings, Store } from 'lucide-react';
import { OPEN_LOCATION_PICKER } from '@/lib/locationPickerEvent';
import useOwnerOverview from '@/hooks/useOwnerOverview';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';

export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // the picker lives on the home page: open it there, or go there and open it
  const openLocationPicker = () => {
    if (pathname === '/') window.dispatchEvent(new Event(OPEN_LOCATION_PICKER));
    else navigate('/?picker=1');
  };
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { hasApproved, unseen } = useOwnerOverview();

  return (
    <div className="sticky top-0 bg-card border-border border-b z-30 py-3">
      <div className="px-4 max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo - Clickable to go home */}
        <button
          onClick={() => navigate('/')}
          className="text-right font-bold text-2xl text-primary hover:opacity-80 transition-opacity cursor-pointer"
          title="חזור לבית"
          aria-label="מה יש פה - חזור לבית"
        >
          מה יש פה?
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          {/* Business owners: the landing page, or their own page once approved */}
          <button
            onClick={() => navigate(hasApproved ? '/my-business' : '/for-business')}
            className="relative flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            title={hasApproved ? 'העסקים שלי' : 'בעל עסק?'}
            aria-label={hasApproved ? 'העסקים שלי' : 'בעל עסק'}
          >
            <Store size={16} />
            <span>{hasApproved ? 'העסקים שלי' : 'בעל עסק'}</span>
            {unseen > 0 && (
              <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-card" aria-label={`${unseen} עדכונים חדשים`} />
            )}
          </button>
          <button
            onClick={openLocationPicker}
            className="p-2 rounded-full bg-primary/10 transition-colors hover:bg-primary/20 text-primary"
            title="בחר מיקום ומרחק"
            aria-label="בחר מיקום ומרחק"
          >
            <MapPin size={26} />
          </button>
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
            className="p-2 rounded-full transition-colors hover:bg-secondary text-primary"
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
