import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res: any = await api.post('/auth/login', { email, password: pass });
      const { accessToken, user: loggedUser } = res.data;
      setToken(accessToken);
      setUser(loggedUser);
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('erp_user', JSON.stringify(loggedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('erp_user');
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'Administrator') return true;
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
