import React, { useState, useMemo, useEffect } from 'react';
import { Button, Drawer, Empty, Input, Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building, Users, UserPlus, Bed, Calendar, FileText, Settings,
  ChefHat, Receipt, Wifi, Wrench, DollarSign, CreditCard, Truck,
  ClipboardCheck, MessageCircle, AlertCircle, UserX, CalendarDays,
  Package, Database, Coffee, ShoppingBag, BarChart2, Zap,
  Clipboard, Cake, Search, LogOut, Activity
} from 'lucide-react';

const MENU_STRUCTURE = {
  admin: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }, { id: 'activity-logs', label: 'Activity Logs', icon: Activity }] },
    {
      title: 'Hostel Management',
      items: [
        { id: 'hostels', label: 'Manage Hostels', icon: Building },

        // ✅ UPDATED: Single room management entry
        { id: 'room-management', label: 'Manage Rooms', icon: Bed },

        { id: 'days-reduc', label: 'Mess Reductions', icon: FileText },
      ]
    },
    {
      title: 'User Management',
      items: [
        { id: 'create-user', label: 'Create User', icon: UserPlus },
        { id: 'sessions', label: 'Manage Batches', icon: Calendar },
        { id: 'monthly-attendance-import', label: 'Monthly Attendance Import', icon: ClipboardCheck },
        { id: 'outpass-logs', label: 'Outpass Logs', icon: FileText },
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
        { id: 'consumption', label: 'Record Additional Consumption', icon: ClipboardCheck },
        { id: 'manage-inventories', label: 'Manage Inventories', icon: Database },
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
    { title: 'Menu Management', items: [
      { id: 'menus', label: "Today's Menu", icon: ChefHat },
      { id: 'weekly-menu', label: 'Weekly Plan', icon: Calendar },
      { id: 'menu-settings', label: 'Menu Settings', icon: Settings },
    ] },
    {
      title: 'Student Management',
      items: [
        { id: 'students', label: 'Manage Students', icon: Users },
        { id: 'enroll-student', label: 'Enroll Student', icon: UserPlus },
        { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
        { id: 'leave-requests', label: 'Leave Requests', icon: Calendar },
        { id: 'outpass-approval', label: 'Outpass Approval', icon: Clipboard },
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
        { id: 'warden-day-red', label: 'Mess Reductions', icon: FileText },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
        { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        { id: 'rebate', label: 'Legacy Rebates', icon: CreditCard },
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
        { id: 'day-reduction', label: 'Mess Reductions', icon: FileText },
        { id: 'outpass', label: 'Gate Outpass', icon: Clipboard },
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
        // { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'hfee', label: 'Fees', icon: DollarSign }, 
        // { id: 'mess-charges', label: 'Mess Charges', icon: DollarSign },
        // { id: 'hostel-fees', label: 'Hostel Fees', icon: Building },
      ]
    },
    {
      title: 'Additional Food',
      items: [
        { id: 'food-order', label: 'Additional Food', icon: Coffee },
        { id: 'my-food-orders', label: 'My Additional Food', icon: ShoppingBag },
      ]
    }
  ],

  mess: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
    {
      title: 'Menu Management',
      items: [
        { id: 'menus', label: "Today's Menu", icon: ChefHat },
        { id: 'weekly-menu', label: 'Weekly Plan', icon: Calendar },
        { id: 'recipe', label: 'Recipes', icon: Cake },
        { id: 'menu-settings', label: 'Menu Settings', icon: Settings },
      ]
    },
    {
      title: 'Inventory & Stock',
      items: [
        { id: 'manage-inventories', label: 'Manage Inventories', icon: Database, adminOnly: true },
        { id: 'single-page-daily-entry', label: 'Single-Page Meal Entry', icon: Zap },
        { id: 'inventory', label: 'Inventory Management', icon: Package },
        { id: 'uoms', label: 'Units of Measure', icon: Settings },
        { id: 'record-consumption', label: 'Record Consumption', icon: Clipboard },
      ]
    },
    {
      title: 'Store Management',
      items: [
        { id: 'stores', label: 'Manage Stores', icon: Building },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: Truck },
        { id: 'purchase-by-store', label: 'Purchase by Store', icon: Truck },
        // Item-store mapping is disabled; purchases use the item and store masters.
        // { id: 'item-store-mapping', label: 'Item-Store Mapping', icon: List },
      ]
    },
    {
      title: 'Additional Food Orders',
      items: [
        { id: 'special-food-items', label: 'Additional Food Items', icon: Coffee },
        { id: 'consumption', label: 'Record Additional Consumption', icon: ClipboardCheck },
        { id: 'food-orders-dashboard', label: 'Orders Dashboard', icon: ShoppingBag },
      ]
    },
    {
      title: 'Reports & Analytics',
      items: [
        { id: 'inventory-reports', label: 'Hostel / Inventory Reports', icon: BarChart2 },
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


const Sidebar = ({ currentView, setCurrentView, isOpen, setIsOpen, isCollapsed, workspace }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const role = user?.role === 'admin' ? workspace || 'admin' : user?.role;

  useEffect(() => { setSearchQuery(''); setIsOpen(false); }, [role, setIsOpen]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = event => { if (event.matches) setIsOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [setIsOpen]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (MENU_STRUCTURE[role] || []).map(section => ({
      ...section,
      items: section.items.filter(item => (!item.adminOnly || user?.role === 'admin') && (!query || item.label.toLowerCase().includes(query))),
    })).filter(section => section.items.length);
  }, [role, searchQuery, user?.role]);

  const items = filteredMenu.map(section => ({
    key: section.title, type: 'group', label: section.title,
    children: section.items.map(({ id, label, icon: Icon }) => ({
      key: id, label, title: label, icon: <Icon size={18} aria-hidden="true" />,
    })),
  }));

  const selectItem = ({ key }) => {
    setCurrentView(key);
    navigate(`/${key}${user?.role === 'admin' ? `?workspace=${workspace || 'admin'}` : ''}`);
    setIsOpen(false);
  };

  const navigation = (collapsed, mobile = false) => <>
    <div className="workspace-sidebar-heading">
      {collapsed ? <img className="workspace-sidebar-logo" src="/nec-logo.png" alt="National Engineering College logo" /> : <>
        <span className="workspace-sidebar-eyebrow">Your workspace</span>
        <strong>{role === 'mess' ? 'Mess & dining' : `${role || 'Hostel'} portal`}</strong>
      </>}
    </div>
    {!collapsed && <div className="workspace-nav-search">
      <Input allowClear prefix={<Search size={16} />} placeholder="Find a page…" aria-label="Search navigation" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
    </div>}
    <nav aria-label={mobile ? 'Mobile workspace navigation' : 'Workspace navigation'} className="workspace-nav-scroll">
      {items.length ? <Menu theme="light" mode="inline" inlineCollapsed={collapsed} selectedKeys={[currentView === 'create-hostel' ? 'hostels' : ['items', 'stock', 'inventory-transactions'].includes(currentView) ? 'inventory' : currentView]} items={items} onClick={selectItem} /> :
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching pages" />}
    </nav>
    <div className="workspace-sidebar-footer">
      <Button type="text" block icon={<LogOut size={18} />} onClick={logout} aria-label="Sign out">{!collapsed && 'Sign out'}</Button>
      {!collapsed && <span>National Engineering College</span>}
    </div>
  </>;

  return <>
    <aside id="workspace-desktop-navigation" className={`workspace-sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
      {navigation(isCollapsed)}
    </aside>
    <Drawer title="Hostel Management" placement="left" size={304} open={isOpen} onClose={() => setIsOpen(false)} rootClassName="workspace-navigation-drawer" styles={{ body: { padding: 0, background: '#ffffff', display: 'flex', flexDirection: 'column' } }}>
      <div id="workspace-mobile-navigation" className="workspace-mobile-navigation">{navigation(false, true)}</div>
    </Drawer>
  </>;
};

export default Sidebar;
