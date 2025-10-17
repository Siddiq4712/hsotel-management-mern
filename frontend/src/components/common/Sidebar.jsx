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
          { id: 'mess-bills', label: 'Mess Bills', icon: Receipt },
        ];
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'profile', label: 'My Profile', icon: Users },
          // { id: 'Mess Bills', label:'Mess Bills', type:'section'},
          // { id: 'apply-leave', label: 'Apply Leave', icon: Calendar },
          { id: 'my-leaves', label: 'My Leaves', icon: FileText },
          // { id: 'submit-complaint', label: 'Submit Complaint', icon: MessageCircle },
          { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
          { id: 'facilities', label: 'Facilities', icon: Wifi },
          { id: 'transactions', label: 'Transactions', icon: CreditCard },
          // { id: 'view-bills', label: 'Mess Bills', icon: Receipt },
          { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },
          { id: 'food-order', label: 'Order Special Food', icon: Coffee },
          { id: 'my-food-orders', label: 'My Food Orders', icon: ShoppingBag },
        ];
        // case 'lapc':
        // return [
        //   { id: 'dashboard', label: 'Dashboard', icon: Home },
        //   { id: 'profile', label: 'My Profile', icon: Users },
        //   { id: 'apply-leave', label: 'Apply Leave', icon: Calendar },
        //   { id: 'my-leaves', label: 'My Leaves', icon: FileText },
        //   { id: 'submit-complaint', label: 'Submit Complaint', icon: MessageCircle },
        //   { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
        //   { id: 'facilities', label: 'Facilities', icon: Wifi },
        //   { id: 'transactions', label: 'Transactions', icon: CreditCard },
        //   { id: 'view-bills', label: 'Mess Bills', icon: Receipt },
        //   { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },
        //   { id: 'food-order', label: 'Order Special Food', icon: Coffee },
        //   { id: 'my-food-orders', label: 'My Food Orders', icon: ShoppingBag },
        // ];
      // Update the mess menu items to match our simplified workflow:

case 'mess':
  return [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'section-menu', label: 'Menu Management', type: 'section' },
    { id: 'menus', label: 'Manage Menus', icon: ChefHat },
    { id: 'items', label: 'Manage Items', icon: Coffee },
    { id: 'menu-planner', label: 'Menu Planner', icon: Calendar }, // New item
    { id: 'menu-schedule', label: 'Menu Schedule', icon: ClipboardCheck },
    { id: 'create-menu', label: 'Create Menu', icon: ChefHat },
    
    { id: 'section-inventory', label: 'Inventory Management', type: 'section' },
    { id: 'uoms', label: 'Units of Measure', icon: Settings },
    { id: 'stock', label: 'Stock Management', icon: Database },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'consumption', label: 'Daily Consumption', icon: ClipboardCheck },
    
    { id: 'section-store', label: 'Store Management', type: 'section' },
    { id: 'stores', label: 'Manage Stores', icon: Building },
    { id: 'purchase-by-store', label: 'Purchase by Store', icon: Truck }, // New item
    { id: 'record-consumption', label: 'Record Consumption', icon: Clipboard },
    { id: 'item-store-mapping', label: 'Item-Store Mapping', icon: List },
    
    // { id: 'section-operations', label: 'Daily Operations', type: 'section' },
    // { id: 'daily-operations', label: 'Mess Operations', icon: Clock },
    
    { id: 'section-special', label: 'Special Food Orders', type: 'section' },
    { id: 'special-food-items', label: 'Special Food Items', icon: Coffee },
    { id: 'food-orders-dashboard', label: 'Order Dashboard', icon: ShoppingBag }, // Updated item
    
    { id: 'section-reports', label: 'Reports', type: 'section' },
    { id: 'consumption-report', label: 'Consumption Report', icon: BarChart2 },
    { id: 'Daily-expenses', label: 'Daily Expenses', icon: Receipt }, // New item

    {id:'Fees Calculation', label:'Fees Calculation', type:'section'},
    {id:'paper-bill-generator', label:'Paper Bill Generator', icon: FileText},
    {id:'calculate-daily-charges', label:'Calculate Daily Charges', icon: CreditCard},
    {id: 'hostel-additional-income', label: 'Additional Income', icon: DollarSign },
    {id:'mess-fee', label:'Mess Fee Summary', icon: FileText},
    {id: 'daily-rate-report', label:'Daily Rate', icon : CreditCard},
    {id:'income-deduction-entry', label:'Income Entry', icon: DollarSign},
    
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
