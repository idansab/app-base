import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);

  // For standalone mode, we auto-authenticate as admin
  useEffect(() => {
    const checkAppState = async () => {
      try {
        // In standalone mode, load a demo user with admin role
        const demoUser = {
          id: 'user-1',
          email: 'admin@mayhishpo.local',
          role: 'admin',
          name: 'מנהל האפליקציה',
        };
        setUser(demoUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (error) {
        console.error('App state check failed:', error);
        setAuthError({
          type: 'unknown',
          message: 'שגיאה בטעינת האפליקציה'
        });
      }
    };

    checkAppState();
  }, []);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
  };

  const navigateToLogin = () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: {},
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth: async () => {},
      checkAppState: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
