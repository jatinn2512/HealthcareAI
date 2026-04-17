import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, CurrentUserData } from './apiClient';
import { clearAuthSession, isAuthenticated, saveAuthSession } from './auth';

export type CurrentUser = CurrentUserData;

export interface AuthContextType {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (payload: { full_name: string; email: string; password: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.getCurrentUser();
      if (response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        if (response.status === 401) {
          clearAuthSession();
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string }) => {
      setError(null);
      setIsLoading(true);

      try {
        // First register
        const registerResponse = await apiClient.register(payload);
        if (registerResponse.error) {
          throw new Error(registerResponse.error);
        }

        // Then login
        const loginResponse = await apiClient.login({
          email: payload.email,
          password: payload.password,
        });

        if (loginResponse.error) {
          throw new Error(loginResponse.error);
        }

        if (!loginResponse.data) {
          throw new Error('Invalid login response');
        }

        saveAuthSession(
          loginResponse.data.access_token,
          loginResponse.data.refresh_token,
          payload.full_name
        );

        // Set user data directly from register response (avoid extra /me call)
        if (registerResponse.data) {
          setUser(registerResponse.data);
        } else {
          // Fallback: fetch user data if needed
          await fetchCurrentUser();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCurrentUser]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const response = await apiClient.login({ email, password });

        if (response.error) {
          throw new Error(response.error);
        }

        if (!response.data) {
          throw new Error('Invalid login response');
        }

        saveAuthSession(response.data.access_token, response.data.refresh_token);
        const profileResponse = await apiClient.getCurrentUser();
        if (profileResponse.error || !profileResponse.data) {
          clearAuthSession();
          throw new Error(profileResponse.error || 'Unable to load your account after login.');
        }
        setUser(profileResponse.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCurrentUser]
  );

  const logout = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      clearAuthSession();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user) || isAuthenticated(),
    isLoading,
    error,
    register,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
