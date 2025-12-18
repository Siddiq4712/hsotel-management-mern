import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building, Users, UserPlus, Bed, Calendar, FileText, Settings,
  ChefHat, Receipt, Wifi, Wrench, DollarSign, CreditCard, Truck,
  ClipboardCheck, MessageCircle, AlertCircle, UserX, CalendarDays,
  Package, Database, Coffee, ShoppingBag, List, BarChart2,
  Clipboard, Menu, X
} from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, isOpen, setIsOpen }) => {
  const { user } = useAuth();

  const getMenuItems = () => {
    switch (user?.role) {
      // 🔷 ADMIN SIDEBAR
      case 'admin':
        return [
          { id: 'section-main', label: 'Main', type: 'section' },
          { id: 'dashboard', label: 'Dashboard', icon: Home },

          { id: 'section-hostel', label: 'Hostel Management', type: 'section' },
          { id: 'hostels', label: 'Manage Hostels', icon: Building },
          { id: 'create-hostel', label: 'Create Hostel', icon: Building },
          { id: 'room-types', label: 'Room Types', icon: Bed },
          { id: 'rooms', label: 'Manage Rooms', icon: Bed },
          { id: 'days-reduc', label: 'Day Reductions', icon: FileText },

          { id: 'section-users', label: 'User Management', type: 'section' },
          { id: 'create-user', label: 'Create User', icon: UserPlus },
          { id: 'sessions', label: 'Manage Sessions', icon: Calendar },

          { id: 'section-facility', label: 'Facilities & Maintenance', type: 'section' },
          { id: 'facility-types', label: 'Facility Types', icon: Wifi },
          { id: 'facilities', label: 'Manage Facilities', icon: Wifi },
          { id: 'maintenance', label: 'Maintenance', icon: Wrench },

          { id: 'section-finance', label: 'Financial Setup', type: 'section' },
          { id: 'income-types', label: 'Income Types', icon: DollarSign },
          { id: 'expense-types', label: 'Expense Types', icon: CreditCard },

          { id: 'section-supply', label: 'Store & Supply', type: 'section' },
          { id: 'suppliers', label: 'Suppliers', icon: Truck },
          { id: 'uoms', label: 'Units of Measure', icon: Database },
        ];

      // 🔷 WARDEN SIDEBAR
      case 'warden':
        return [
          { id: 'section-main', label: 'Main', type: 'section' },
          { id: 'dashboard', label: 'Dashboard', icon: Home },

          { id: 'section-students', label: 'Student Management', type: 'section' },
          { id: 'students', label: 'Manage Students', icon: Users },
          { id: 'enroll-student', label: 'Enroll Student', icon: UserPlus },
          { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
          { id: 'leave-requests', label: 'Leave Requests', icon: Calendar },
          { id: 'suspensions', label: 'Suspensions', icon: UserX },

          { id: 'section-rooms', label: 'Rooms', type: 'section' },
          { id: 'room-allotment', label: 'Room Allotment', icon: Bed },
          { id: 'create-room', label: 'Create Room', icon: Bed },
          { id: 'view-layout', label: 'View Layout', icon: Building },
          { id: 'approve-room-requests', label: 'Room Requests', icon: Building },

          { id: 'section-misc', label: 'Miscellaneous', type: 'section' },
          { id: 'warden-day-red', label: 'Day Reduction List', icon: FileText },
          { id: 'complaints', label: 'Complaints', icon: MessageCircle },
          { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        ];

      // 🔷 STUDENT SIDEBAR
      case 'student':
        return [
          { id: 'section-main', label: 'Main', type: 'section' },
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'profile', label: 'My Profile', icon: Users },

          { id: 'section-requests', label: 'Requests', type: 'section' },
          { id: 'my-leaves', label: 'My Leaves', icon: FileText },
          { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
          { id: 'day-reduction', label: 'Apply Day Reduction', icon: FileText },

          { id: 'section-information', label: 'Information', type: 'section' },
          { id: 'facilities', label: 'Facilities', icon: Wifi },
          { id: 'view-rooms', label: 'View Room', icon: Building },

          { id: 'section-finance', label: 'Finance & Mess', type: 'section' },
          { id: 'transactions', label: 'Transactions', icon: CreditCard },
          { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },

          { id: 'section-food', label: 'Special Food', type: 'section' },
          { id: 'food-order', label: 'Order Special Food', icon: Coffee },
          { id: 'my-food-orders', label: 'My Food Orders', icon: ShoppingBag },
        ];

      // 🔷 MESS STAFF SIDEBAR
      case 'mess':
        return [
          { id: 'section-main', label: 'Main', type: 'section' },
          { id: 'dashboard', label: 'Dashboard', icon: Home },

          { id: 'section-menu', label: 'Menu Management', type: 'section' },
          { id: 'menus', label: 'Manage Menus', icon: ChefHat },
          { id: 'create-menu', label: 'Create Menu', icon: ChefHat },
          { id: 'menu-planner', label: 'Menu Planner', icon: Calendar },
          { id: 'menu-schedule', label: 'Menu Schedule', icon: ClipboardCheck },

          { id: 'section-inventory', label: 'Inventory & Stock', type: 'section' },
          { id: 'items', label: 'Manage Items', icon: Coffee },
          { id: 'uoms', label: 'Units of Measure', icon: Settings },
          { id: 'stock', label: 'Stock Management', icon: Database },
          { id: 'inventory', label: 'Inventory Logs', icon: Package },
          { id: 'record-consumption', label: 'Record Consumption', icon: Clipboard },

          { id: 'section-store', label: 'Store Management', type: 'section' },
          { id: 'stores', label: 'Manage Stores', icon: Building },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: Truck },
          { id: 'purchase-by-store', label: 'Purchase by Store', icon: Truck },
          { id: 'item-store-mapping', label: 'Item-Store Mapping', icon: List },

          { id: 'section-special', label: 'Special Food Orders', type: 'section' },
          { id: 'special-food-items', label: 'Special Food Items', icon: Coffee },
          { id: 'consumption', label: 'Record Special Consumption', icon: ClipboardCheck },
          { id: 'food-orders-dashboard', label: 'Orders Dashboard', icon: ShoppingBag },

          { id: 'section-reports', label: 'Reports & Analytics', type: 'section' },
          { id: 'consumption-report', label: 'Consumption Report', icon: BarChart2 },
          { id: 'Daily-expenses', label: 'Daily Expenses', icon: Receipt },
          { id: 'daily-rate-report', label: 'Daily Rate Calculation', icon: CreditCard },

          { id: 'section-fees', label: 'Fee & Billing', type: 'section' },
          { id: 'mess-fee', label: 'Mess Fee Summary', icon: FileText },
          { id: 'bed-fee-management', label: 'Bed Fee Management', icon: Bed },
          { id: 'paper-bill-generator', label: 'Paper Bill Generator', icon: FileText },
          { id: 'income-deduction-entry', label: 'Income Entry', icon: DollarSign },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const handleMenuItemClick = (itemId) => {
    setCurrentView(itemId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4 border-b border-gray-700">
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-gray-700 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-2 px-4 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuItems.map((item) => {
            if (item.type === 'section') {
              return (
                <div
                  key={item.id}
                  className="text-xs uppercase tracking-wider text-gray-400 mt-4 mb-2"
                >
                  {item.label}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
