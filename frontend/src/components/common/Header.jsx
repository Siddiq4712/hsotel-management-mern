import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, User, Bell } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="flex justify-between items-center px-4 lg:px-8 w-full">
        
        {/* Left Section: Brand & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Open Menu"
          >
            <Menu size={22} />
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-4">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              <span className="font-serif font-medium tracking-wide text-gray-800">
  National Engineering College
</span>

            </h1>
            <div className="hidden lg:block h-4 w-[1px] bg-slate-300"></div>
            <span className="text-[10px] lg:text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-100 self-start lg:self-center">
              {user?.role} Portal
            </span>
          </div>
        </div>

        {/* Right Section: User & Actions */}
        <div className="flex items-center gap-3 lg:gap-6">
          <button className="hidden sm:flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <Bell size={20} />
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-100 lg:border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none capitalize">
                {user?.username || 'User Account'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium italic">
                {user?.hostel?.name || 'Central Management'}
              </p>
            </div>
            
            {/* Avatar */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-blue-600 font-bold shadow-inner">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="profile" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <User size={20} className="text-slate-400" />
              )}
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-semibold text-sm"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;