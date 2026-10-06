import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Bell, Lock, HelpCircle, LogOut } from 'lucide-react';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('he');

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-20 py-4">
        <div className="px-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-right text-green-600">הגדרות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-2xl mx-auto py-6 space-y-6">
        {/* Display Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h2 className="font-bold text-lg text-right mb-4">מראה</h2>

          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-3">
            <label className="flex items-center gap-3 cursor-pointer">
              {darkMode ? (
                <Moon size={20} className="text-slate-700" />
              ) : (
                <Sun size={20} className="text-yellow-500" />
              )}
              <span className="font-medium">{darkMode ? 'מצב לילה' : 'מצב יום'}</span>
            </label>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-colors ${
                darkMode ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <label className="font-medium">שפה</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
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
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h2 className="font-bold text-lg text-right mb-4">התראות</h2>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <Bell size={20} className="text-green-600" />
              <span className="font-medium">הפעל התראות</span>
            </label>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-green-600' : 'bg-gray-300'
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
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h2 className="font-bold text-lg text-right mb-4">פרטיות ואבטחה</h2>

          <button className="w-full p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between text-right mb-3">
            <Lock size={20} className="text-gray-600" />
            <span className="font-medium">שנה סיסמה</span>
          </button>

          <button className="w-full p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between text-right">
            <HelpCircle size={20} className="text-gray-600" />
            <span className="font-medium">מדיניות פרטיות</span>
          </button>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 border border-gray-200"
        >
          <h2 className="font-bold text-lg text-right mb-4">אודות</h2>

          <div className="space-y-3 text-right">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">גרסה</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">שם האפליקציה</span>
              <span className="font-medium">מה יש פה?</span>
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          התנתקות
        </motion.button>
      </div>
    </div>
  );
}
