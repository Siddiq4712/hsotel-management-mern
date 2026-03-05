import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();
const normalizeRole = (role) => {
  if (role === null || role === undefined) return null;

  const normalized = String(role).trim().toLowerCase();
  const roleMap = {
    admin: 'admin',
    administrator: 'admin',
    1: 'admin',
    warden: 'warden',
    3: 'warden',
    student: 'student',
    2: 'student',
    lapc: 'lapc',
    mess: 'mess',
    messstaff: 'mess',
    'mess staff': 'mess',
    4: 'mess'
  };

  return roleMap[normalized] || normalized;
};

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  const normalizedRole = normalizeRole(rawUser.role ?? rawUser.roleName ?? rawUser?.role?.roleName);
  return {
    ...rawUser,
    role: normalizedRole
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const parsedUser = normalizeUser(JSON.parse(savedUser));
      localStorage.setItem('user', JSON.stringify(parsedUser));
      setUser(parsedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      const normalizedUser = normalizeUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
