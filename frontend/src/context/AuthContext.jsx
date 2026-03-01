import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('cc_user');
    const token  = localStorage.getItem('cc_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('cc_user', JSON.stringify(userData));
    localStorage.setItem('cc_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('cc_user');
    localStorage.removeItem('cc_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const isAdmin   = () => user?.role === 'admin';
  const isScorer  = () => user?.role === 'scorer' || user?.role === 'admin';
  const isPlayer  = () => !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isScorer, isPlayer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
