import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };

  // Function to render avatar with fallback to initials
  const renderAvatar = () => {
    if (user?.profile_picture && !imageError) {
      return (
        <img
          src={user.profile_picture}
          alt={user?.username || "User"}
          className="w-8 h-8 rounded-full object-cover border border-gray-300"
          onError={handleImageError}
        />
      );
    } else {
      // If no image or image error, show initials in an avatar
      const initials = user?.username ? user.username.charAt(0).toUpperCase() : "?";
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white font-bold text-sm">
          {initials}
        </div>
      );
    }
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
            {renderAvatar()}
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
