import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setAuthToken } from '../api/api';
import { normalizeRole } from '../utils/role';

export const AuthContext = createContext();

const normalizeUser = (rawUser) => {
  if (!rawUser) return rawUser;
  // Prefer explicit role text from backend; numeric role IDs can vary between deployments.
  const roleSource =
    rawUser.roleName ??
    rawUser?.role?.roleName ??
    rawUser.role ??
    rawUser.roleId;

  return {
    ...rawUser,
    role: normalizeRole(roleSource),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data on startup
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        if (token && savedUser) {
          setAuthToken(token);
          setUser(normalizeUser(JSON.parse(savedUser)));
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Standard Login (userName/Password)
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;
      const normalizedUser = normalizeUser(userData);

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
      setAuthToken(token);
      setUser(normalizedUser);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  // Google Login Completion (Hand-off from LoginScreen)
  const completeExternalLogin = async (token, userData) => {
    try {
      setLoading(true);
      const normalizedUser = normalizeUser(userData);
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
      setAuthToken(token);
      setUser(normalizedUser);
      return { success: true };
    } catch (error) {
      console.error('External login storage error:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, completeExternalLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
