import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building, Users, UserPlus, Bed, Calendar, FileText, Settings,
  ChefHat, Receipt, Wifi, Wrench, DollarSign, CreditCard, Truck,
  ClipboardCheck, MessageCircle, AlertCircle, UserX, CalendarDays,
  Package, Database, Coffee, ShoppingBag, List, BarChart2,
  Clipboard, ChevronLeft, ChevronRight, Cake, Search, LogOut
} from 'lucide-react';

const MENU_STRUCTURE = {
  admin: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
    {
      title: 'Hostel Management',
      items: [
        { id: 'hostels', label: 'Manage Hostels', icon: Building },
        { id: 'create-hostel', label: 'Create Hostel', icon: Building },
        { id: 'room-types', label: 'Room Types', icon: Bed },
        { id: 'rooms', label: 'Manage Rooms', icon: Bed },
        { id: 'days-reduc', label: 'Day Reductions', icon: FileText },
      ]
    },
    {
      title: 'User Management',
      items: [
        { id: 'create-user', label: 'Create User', icon: UserPlus },
        { id: 'sessions', label: 'Manage Sessions', icon: Calendar },
      ]
    },
    {
      title: 'Facilities & Maintenance',
      items: [
        { id: 'facility-types', label: 'Facility Types', icon: Wifi },
        { id: 'facilities', label: 'Manage Facilities', icon: Wifi },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      ]
    },
    {
      title: 'Financial Setup',
      items: [
        { id: 'income-types', label: 'Income Types', icon: DollarSign },
        { id: 'expense-types', label: 'Expense Types', icon: CreditCard },
      ]
    },
    {
      title: 'Measure',
      items: [
        { id: 'uoms', label: 'Units of Measure', icon: Database },
      ]
    }
  ],
  warden: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
    {
      title: 'Student Management',
      items: [
        { id: 'students', label: 'Manage Students', icon: Users },
        { id: 'enroll-student', label: 'Enroll Student', icon: UserPlus },
        { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
        { id: 'leave-requests', label: 'Leave Requests', icon: Calendar },
        { id: 'suspensions', label: 'Suspensions', icon: UserX },
      ]
    },
    {
      title: 'Rooms',
      items: [
        { id: 'room-allotment', label: 'Room Allotment', icon: Bed },
        { id: 'create-room', label: 'Create Room', icon: Bed },
        { id: 'view-layout', label: 'View Layout', icon: Building },
        { id: 'approve-room-requests', label: 'Room Requests', icon: Building },
      ]
    },
    {
      title: 'Miscellaneous',
      items: [
        { id: 'warden-day-red', label: 'Day Reduction List', icon: FileText },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
        { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        { id: 'rebate', label: 'Rebates', icon: CreditCard},
      ]
    }
  ],
  student: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }, { id: 'profile', label: 'My Profile', icon: Users }] },
    {
      title: 'Requests',
      items: [
        { id: 'my-leaves', label: 'My Leaves', icon: FileText },
        { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
        { id: 'day-reduction', label: 'Apply Day Reduction', icon: FileText },
      ]
    },
    {
      title: 'Information',
      items: [
        { id: 'view-rooms', label: 'View Room', icon: Building },
      ]
    },
    {
      title: 'Finance & Mess',
      items: [
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },
      ]
    },
    {
      title: 'Special Food',
      items: [
        { id: 'food-order', label: 'Order Special Food', icon: Coffee },
        { id: 'my-food-orders', label: 'My Food Orders', icon: ShoppingBag },
      ]
    }
  ],
  mess: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
    {
      title: 'Menu Management',
      items: [
        { id: 'menus', label: 'Manage Menus', icon: ChefHat },
        { id: 'create-menu', label: 'Create Menu', icon: ChefHat },
        { id: 'recipe', label: 'Create Recipe', icon: Cake },
        { id: 'menu-planner', label: 'Menu Planner', icon: Calendar },
        { id: 'menu-schedule', label: 'Menu Schedule', icon: ClipboardCheck },
      ]
    },
    {
      title: 'Inventory & Stock',
      items: [
        { id: 'items', label: 'Manage Items', icon: Coffee },
        { id: 'uoms', label: 'Units of Measure', icon: Settings },
        { id: 'stock', label: 'Stock Management', icon: Database },
        { id: 'inventory', label: 'Inventory Logs', icon: Package },
        { id: 'record-consumption', label: 'Record Consumption', icon: Clipboard },
      ]
    },
    {
      title: 'Store Management',
      items: [
        { id: 'stores', label: 'Manage Stores', icon: Building },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: Truck },
        { id: 'purchase-by-store', label: 'Purchase by Store', icon: Truck },
        { id: 'item-store-mapping', label: 'Item-Store Mapping', icon: List },
      ]
    },
    {
      title: 'Special Food Orders',
      items: [
        { id: 'special-food-items', label: 'Special Food Items', icon: Coffee },
        { id: 'consumption', label: 'Record Special Consumption', icon: ClipboardCheck },
        { id: 'food-orders-dashboard', label: 'Orders Dashboard', icon: ShoppingBag },
      ]
    },
    {
      title: 'Reports & Analytics',
      items: [
        { id: 'consumption-report', label: 'Consumption Report', icon: BarChart2 },
        { id: 'Daily-expenses', label: 'Daily Expenses', icon: Receipt },
        { id: 'daily-rate-report', label: 'Daily Rate Calculation', icon: CreditCard },
      ]
    },
    {
      title: 'Fee & Billing',
      items: [
        { id: 'mess-fee', label: 'Mess Fee Summary', icon: FileText },
        { id: 'bed-fee-management', label: 'Bed Fee Management', icon: Bed },
        { id: 'paper-bill-generator', label: 'Paper Bill Generator', icon: FileText },
        { id: 'income-deduction-entry', label: 'Income Entry', icon: DollarSign },
      ]
    }
  ]
};

const Sidebar = ({ currentView, setCurrentView, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenu = useMemo(() => {
    const roleMenu = MENU_STRUCTURE[user?.role] || [];
    if (!searchQuery) return roleMenu;
    return roleMenu.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(section => section.items.length > 0);
  }, [user?.role, searchQuery]);

  const handleMenuItemClick = (itemId) => {
    setCurrentView(itemId);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out z-40 flex flex-col border-r border-slate-800 shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72 w-72'}
        `}
      >
        {/* Search Bar Container */}
        <div className={`p-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden py-4">
          {filteredMenu.map((section, idx) => (
            <div key={idx} className="mb-6">
              {/* Section Title: Center a small dash when collapsed */}
              <div className="px-6 mb-2 flex items-center h-4">
                {isCollapsed ? (
                  <div className="w-8 h-[1px] bg-slate-700 mx-auto" />
                ) : (
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap animate-in fade-in duration-500">
                    {section.title}
                  </h3>
                )}
              </div>
              
              <div className="space-y-1 px-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuItemClick(item.id)}
                      className={`group relative w-full flex items-center h-12 rounded-xl transition-all duration-200 overflow-hidden ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                          : 'hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {/* ICON WRAPPER: Fixed width ensures the icon is ALWAYS centered in the 80px (20rem) rail */}
                      <div className="min-w-[56px] flex items-center justify-center shrink-0">
                        <Icon size={22} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`} />
                      </div>
                      
                      {/* LABEL: Hidden via opacity and width to allow icons to center */}
                      <span className={`text-[14px] font-medium whitespace-nowrap transition-all duration-300 ${
                        isCollapsed ? 'opacity-0 translate-x-10 w-0' : 'opacity-100 translate-x-0 w-auto'
                      }`}>
                        {item.label}
                      </span>

                      {/* Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <div className="fixed left-20 px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all border border-slate-700 shadow-2xl z-[70] whitespace-nowrap">
                          {item.label}
                        </div>
                      )}

                      {/* Active Indicator Line for Collapsed State */}
                      {isActive && isCollapsed && (
                        <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <button 
            onClick={logout}
            className={`w-full flex items-center h-12 rounded-xl transition-all text-rose-400 hover:bg-rose-500/10 group overflow-hidden`}
          >
            <div className="min-w-[56px] flex items-center justify-center shrink-0">
              <LogOut size={20} />
            </div>
            <span className={`font-bold text-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </>
  );
};

export default Sidebar;