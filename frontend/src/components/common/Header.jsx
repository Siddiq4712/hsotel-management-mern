import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white shadow-md border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="flex justify-between items-center px-6 w-full">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">
            Hostel Management System
          </h1>
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {user?.role?.toUpperCase()}
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User size={20} className="text-gray-600" />
            <span className="text-gray-700">{user?.username}</span>
            {user?.hostel && (
              <span className="text-sm text-gray-500">
                @ {user.hostel.name}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
