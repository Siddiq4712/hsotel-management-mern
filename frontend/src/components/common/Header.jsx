import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, User, Bell, Search, HelpCircle, Settings } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-50 h-16 flex items-center">
      <div className="flex justify-between items-center px-4 lg:px-8 w-full">
        
        {/* Left Section: Branding & Mobile Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={22} />
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-4">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              <span className="font-serif font-medium tracking-wide text-gray-800">
                NATIONAL ENGINEERING COLLEGE
              </span>
            </h1>
            <div className="hidden lg:block h-4 w-[1px] bg-slate-300"></div>
            <span className="text-[10px] lg:text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
              {user?.role} Portal
            </span>
          </div>
        </div>

        {/* Middle Section: Global Search (Essential for Portals) */}
        {/* <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search students, records, or tools..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>
        </div> */}

        {/* Right Section: Actions & Profile */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Support/Help - Essential for Internal Systems */}
          <button className="hidden sm:flex p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Help & Support">
            <HelpCircle size={20} />
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

          {/* User Profile - Now treated as a clickable Menu trigger */}
          <button className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 rounded-xl transition-all group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <User size={18} />
              )}
            </div>
            
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-800 leading-none">
                {user?.username || 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter font-semibold">
                Account Settings
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;