import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export function AccessibilityProvider({ children }) {
  const [textSize, setTextSize] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [showFocusOutline, setShowFocusOutline] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setTextSize(settings.textSize || 'normal');
      setHighContrast(settings.highContrast || false);
      setShowFocusOutline(settings.showFocusOutline || false);
    }
  }, []);

  useEffect(() => {
    const settings = { textSize, highContrast, showFocusOutline };
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));

    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
    root.setAttribute('data-high-contrast', highContrast);
    root.setAttribute('data-focus-outline', showFocusOutline);

    if (textSize === 'small') {
      root.style.fontSize = '14px';
    } else if (textSize === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [textSize, highContrast, showFocusOutline]);

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        setTextSize,
        highContrast,
        setHighContrast,
        showFocusOutline,
        setShowFocusOutline,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
