import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building, Users, UserPlus, Bed, Calendar, FileText, Settings,
  ChefHat, Receipt, Wifi, Wrench, DollarSign, CreditCard, Truck,
  ClipboardCheck, MessageCircle, AlertCircle, UserX, CalendarDays,
  Package, Database, Coffee, ShoppingBag, List, Clock, BarChart2,
  Clipboard
} from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView }) => {
  const { user } = useAuth();

  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'hostels', label: 'Manage Hostels', icon: Building },
          { id: 'create-hostel', label: 'Create Hostel', icon: Building },
          { id: 'room-types', label: 'Room Types', icon: Bed },
          { id: 'rooms', label: 'Manage Rooms', icon: Home },
          { id: 'create-user', label: 'Create User', icon: UserPlus },
          { id: 'sessions', label: 'Manage Sessions', icon: Calendar },
          { id: 'facility-types', label: 'Facility Types', icon: Wifi },
          { id: 'facilities', label: 'Manage Facilities', icon: Wifi },
          { id: 'maintenance', label: 'Maintenance', icon: Wrench },
          { id: 'income-types', label: 'Income Types', icon: DollarSign },
          { id: 'expense-types', label: 'Expense Types', icon: CreditCard },
          { id: 'suppliers', label: 'Suppliers', icon: Truck },
          { id: 'uoms', label: 'Units of Measure', icon: Database },
        ];
      case 'warden':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'students', label: 'Manage Students', icon: Users },
          { id: 'enroll-student', label: 'Enroll Student', icon: UserPlus },
          { id: 'room-allotment', label: 'Room Allotment', icon: Bed },
          { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
          { id: 'leave-requests', label: 'Leave Requests', icon: Calendar },
          { id: 'complaints', label: 'Complaints', icon: MessageCircle },
          { id: 'suspensions', label: 'Suspensions', icon: UserX },
          { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        ];
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'profile', label: 'My Profile', icon: Users },
          { id: 'apply-leave', label: 'Apply Leave', icon: Calendar },
          { id: 'my-leaves', label: 'My Leaves', icon: FileText },
          { id: 'submit-complaint', label: 'Submit Complaint', icon: MessageCircle },
          { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
          { id: 'facilities', label: 'Facilities', icon: Wifi },
          { id: 'transactions', label: 'Transactions', icon: CreditCard },
          { id: 'view-bills', label: 'Mess Bills', icon: Receipt },
          { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },
          { id: 'food-order', label: 'Order Special Food', icon: Coffee },
          { id: 'my-food-orders', label: 'My Food Orders', icon: ShoppingBag },
        ];
      case 'mess':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'section-menu', label: 'Menu Management', type: 'section' },
          { id: 'menus', label: 'Manage Menus', icon: ChefHat },
          { id: 'items', label: 'Manage Items', icon: Coffee },
          { id: 'menu-schedule', label: 'Menu Schedule', icon: Calendar },

          { id: 'section-inventory', label: 'Inventory & Purchases', type: 'section' }, // Renamed Section
          
          // NEW: Replaced 'inventory-management' with our new component's ID
          { id: 'purchase-by-store', label: 'Purchase by Store', icon: ShoppingBag }, 
          
          { id: 'item-store-mapping', label: 'Item-Store Mapping', icon: Building }, 
          { id: 'inventory-transactions', label: 'All Transactions', icon: List }, // Renamed for clarity
          { id: 'stock', label: 'Current Stock', icon: Database }, // Renamed for clarity
          { id: 'consumption', label: 'Daily Consumption', icon: ClipboardCheck },
          { id: 'uoms', label: 'Units of Measure', icon: Settings },
          
          { id: 'section-supplier', label: 'Supplier & Orders', type: 'section' }, // Renamed Section
          { id: 'suppliers', label: 'Suppliers', icon: Truck },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: Clipboard },

          { id: 'section-finance', label: 'Financial Management', type: 'section' },
          { id: 'bills', label: 'Mess Bills', icon: Receipt },
          { id: 'daily-operations', label: 'Daily Operations', icon: Clock },

          { id: 'section-reports', label: 'Reports & Analytics', type: 'section' },
          { id: 'consumption-report', label: 'Consumption Report', icon: BarChart2 },
          { id: 'reports', label: 'Reports', icon: BarChart2 },

          { id: 'section-special', label: 'Special Orders', type: 'section' }, // New Section
          { id: 'special-food-items', label: 'Special Food Items', icon: Coffee },
          { id: 'food-orders', label: 'Food Orders', icon: ShoppingBag },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-64 bg-gray-800 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">Navigation</h2>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-2 px-4 pb-4">
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
              onClick={() => setCurrentView(item.id)}
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
  );
};

export default Sidebar;
