import { useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  // Log role for debugging
  if (context.user?.role) {
    console.log('User role:', context.user.role);
  }

  return context;
};
