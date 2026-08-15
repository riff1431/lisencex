'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setAuthCookies, clearAuthCookies } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'customer';
  envatoUsername?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, envatoUsername?: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; email?: string; envatoUsername?: string }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);

        // Verify session with server asynchronously
        try {
          const res = await apiRequest('/auth/me');
          if (res?.data) {
            setUser(res.data);
            localStorage.setItem('auth_user', JSON.stringify(res.data));
            setAuthCookies(savedToken, undefined, res.data.role);
          }
        } catch {
          // Token expired or invalid - clear stale data cleanly
          setUser(null);
          setToken(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');
          clearAuthCookies();
        }
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        clearAuthCookies();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const { user: loggedInUser, accessToken, refreshToken } = res.data;
    setUser(loggedInUser);
    setToken(accessToken);
    localStorage.setItem('auth_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('auth_user', JSON.stringify(loggedInUser));
    setAuthCookies(accessToken, refreshToken, loggedInUser.role);
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    envatoUsername?: string,
  ) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        email,
        password,
        ...(envatoUsername ? { envatoUsername } : {}),
      }),
    });

    const { user: registeredUser, accessToken, refreshToken } = res.data;
    setUser(registeredUser);
    setToken(accessToken);
    localStorage.setItem('auth_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('auth_user', JSON.stringify(registeredUser));
    setAuthCookies(accessToken, refreshToken, registeredUser.role);
  };

  const updateProfile = async (data: {
    fullName?: string;
    email?: string;
    envatoUsername?: string;
  }) => {
    const res = await apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (res.data) {
      setUser((prev) => (prev ? { ...prev, ...res.data } : res.data));
      localStorage.setItem('auth_user', JSON.stringify(res.data));
    }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      clearAuthCookies();
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        updateProfile,
        changePassword,
        logout,
        refreshSession,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
