import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '@/api/serverClient';
import { parseJwt } from '@/lib/utils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        setUser({ id: payload.userId || payload.user_id, email: payload.email });
        setIsAuthenticated(true);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkUserAuth = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        setUser({ id: payload.userId || payload.user_id, email: payload.email });
        setIsAuthenticated(true);
        return true;
      }
    }
    setUser(null);
    setIsAuthenticated(false);
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      checkUserAuth,
      api
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
