import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, X } from 'lucide-react';
import { useAccessibility } from '@/lib/AccessibilityContext';

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { textSize, setTextSize, highContrast, setHighContrast, showFocusOutline, setShowFocusOutline } = useAccessibility();

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-16 left-0 bg-card border border-border rounded-2xl shadow-lg p-6 w-80"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">הגדרות נגישות</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-secondary rounded-lg transition"
                  aria-label="סגור"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Text Size */}
              <div>
                <label className="block text-sm font-semibold mb-3">גודל טקסט</label>
                <div className="flex gap-2">
                  {['small', 'normal', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setTextSize(size)}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                        textSize === size
                          ? 'bg-primary text-white'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      aria-pressed={textSize === size}
                    >
                      {size === 'small' && 'קטן'}
                      {size === 'normal' && 'בינוני'}
                      {size === 'large' && 'גדול'}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="text-sm font-semibold">ניגודיות גבוהה</span>
                </label>
              </div>

              {/* Focus Outline */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFocusOutline}
                    onChange={(e) => setShowFocusOutline(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="text-sm font-semibold">הוקוס קווים ברורים</span>
                </label>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setTextSize('normal');
                  setHighContrast(false);
                  setShowFocusOutline(false);
                }}
                className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition text-sm"
              >
                איפוס הגדרות
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessibility Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition flex items-center justify-center"
        aria-label="הגדרות נגישות"
        aria-expanded={isOpen}
      >
        <Eye size={24} />
      </motion.button>
    </div>
  );
}
