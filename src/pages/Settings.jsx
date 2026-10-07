import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Bell, Lock, HelpCircle, LogOut } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('he');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-primary">הגדרות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-2xl mx-auto py-6 space-y-6">
        {/* Display Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">מראה</h2>

          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg mb-3">
            <label className="flex items-center gap-3 cursor-pointer">
              {isDark ? (
                <Moon size={20} className="text-primary" />
              ) : (
                <Sun size={20} className="text-yellow-500" />
              )}
              <span className="font-medium text-foreground">{isDark ? 'מצב לילה' : 'מצב יום'}</span>
            </label>
            <button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <label className="font-medium text-foreground">שפה</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">התראות</h2>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <Bell size={20} className="text-primary" />
              <span className="font-medium text-foreground">הפעל התראות</span>
            </label>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-primary' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">פרטיות ואבטחה</h2>

          <button className="w-full p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-between text-right mb-3 text-foreground">
            <Lock size={20} className="text-muted-foreground" />
            <span className="font-medium">שנה סיסמה</span>
          </button>

          <button className="w-full p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-between text-right text-foreground">
            <HelpCircle size={20} className="text-muted-foreground" />
            <span className="font-medium">מדיניות פרטיות</span>
          </button>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="font-bold text-lg text-right mb-4 text-foreground">אודות</h2>

          <div className="space-y-3 text-right">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">גרסה</span>
              <span className="font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">שם האפליקציה</span>
              <span className="font-medium text-foreground">מה יש פה?</span>
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full p-4 bg-destructive/10 text-destructive rounded-2xl font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          התנתקות
        </motion.button>
      </div>
    </div>
  );
}
