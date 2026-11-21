import { usePermissions } from '../../context/PermissionContext';
import { screenForView } from '../../../../shared/permissions.js';
import React, { useState, useMemo, useEffect } from 'react';
import { Button, Drawer, Empty, Input, Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Building, Users, UserPlus, Bed, Calendar, FileText, Settings, Ruler,
  ChefHat, Receipt, DollarSign, CreditCard, Truck,
  ClipboardCheck, MessageCircle, AlertCircle, UserX, CalendarDays,
  Package, Database, Coffee, ShoppingBag, BarChart2, Zap,
  Clipboard, Cake, Search, LogOut, Activity, Building2, LayoutGrid, Shield
} from 'lucide-react';

const MENU_STRUCTURE = {
  security: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Gate Console', icon: Home }] },
  ],
  admin: [
    { title: 'Workspace', items: [{ id: 'dashboard', label: 'Overview', icon: LayoutGrid }] },
    {
      title: 'Hostel Operations',
      items: [
        { id: 'hostels', label: 'Manage Hostels', icon: Building2 },
        { id: 'room-management', label: 'Manage Rooms', icon: Bed },
        { id: 'sessions', label: 'Manage Batches', icon: Calendar },
        { id: 'monthly-attendance-import', label: 'Monthly Attendance Import', icon: ClipboardCheck },
      ]
    },
    {
      title: 'Requests',
      items: [
        { id: 'days-reduc', label: 'Mess Reductions', icon: FileText },
        { id: 'outpass-logs', label: 'Gate Pass Logs', icon: Clipboard },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'create-user', label: 'Manage Users', icon: Users },
        { id: 'screen-permissions', label: 'Screen Permissions', icon: Shield },
        { id: 'activity-logs', label: 'Activity Logs', icon: Activity },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'income-types', label: 'Income Types', icon: DollarSign },
        { id: 'expense-types', label: 'Expense Types', icon: CreditCard },
        { id: 'uoms', label: 'Units of Measure', icon: Ruler },
      ]
    },
  ],

  warden: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
  /*  { title: 'Menu Management', items: [
      { id: 'menus', label: "Today's Menu", icon: ChefHat },
      { id: 'weekly-menu', label: 'Weekly Plan', icon: Calendar },
      { id: 'menu-settings', label: 'Menu Settings', icon: Settings },
    ] }*/
    {
      title: 'Student Management',
      items: [
        { id: 'students', label: 'Manage Students', icon: Users },
        { id: 'enroll-student', label: 'Enroll Student', icon: UserPlus },
        { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
        { id: 'suspensions', label: 'Suspensions', icon: UserX },
      ]
    },
    {
      title: 'Rooms',
      items: [
        { id: 'room-allotment', label: 'Room Allotment', icon: Bed },
        { id: 'create-room', label: 'Manage Rooms', icon: Bed },
      //  { id: 'view-layout', label: 'View Layout', icon: Building },
      ]
    },
    {
      title: 'Miscellaneous',
      items: [
        { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        { id: 'rebate', label: 'Legacy Rebates', icon: CreditCard },
      ]
    },
    {
      title: 'Requests',
      items: [
        { id: 'leave-requests', label: 'Leave Requests', icon: Calendar },
        { id: 'warden-day-red', label: 'Mess Reductions', icon: FileText },
        { id: 'outpass-approval', label: 'Gate Pass Requests', icon: Clipboard },
        { id: 'approve-room-requests', label: 'Room Requests', icon: Building },
        { id: 'complaints', label: 'Complaints', icon: MessageCircle },
      ]
    },
  ],

  student: [
    { title: 'Main', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }, { id: 'profile', label: 'My Profile', icon: Users }] },
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
    },
    {
      title: 'Requests',
      items: [
        { id: 'my-leaves', label: 'My Leaves', icon: Calendar },
        { id: 'day-reduction', label: 'Mess Reductions', icon: FileText },
        { id: 'outpass', label: 'Gate Pass', icon: Clipboard },
        { id: 'view-rooms', label: 'Rooms & Requests', icon: Building },
        { id: 'my-complaints', label: 'My Complaints', icon: AlertCircle },
      ]
    },
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
  const { can } = usePermissions();
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
      items: section.items.filter(item => (!item.adminOnly || user?.role === 'admin') && can(screenForView(item.id, role)) && (!query || item.label.toLowerCase().includes(query))),
    })).filter(section => section.items.length);
  }, [role, searchQuery, user?.role, can]);

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
    {role !== 'admin' && <div className="workspace-sidebar-heading">
      {collapsed ? <img className="workspace-sidebar-logo" src="/nec-logo.png" alt="National Engineering College logo" /> : <>
        <span className="workspace-sidebar-eyebrow">Your workspace</span>
        <strong>{role === 'student' && user?.resident_type === 'staff' ? 'Staff resident portal' : role === 'mess' ? 'Mess & dining' : `${role || 'Hostel'} portal`}</strong>
      </>}
    </div>}
    {!collapsed && <div className={`workspace-nav-search${role === 'admin' ? ' admin-nav-search' : ''}`}>
      <Input allowClear prefix={<Search size={16} />} placeholder="Find a page…" aria-label="Search navigation" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
    </div>}
    <nav aria-label={mobile ? 'Mobile workspace navigation' : 'Workspace navigation'} className="workspace-nav-scroll">
      {items.length ? <Menu theme="light" mode="inline" inlineCollapsed={collapsed} inlineIndent={role === 'admin' ? 12 : undefined}
        selectedKeys={[currentView === 'create-hostel' ? 'hostels' : ['items', 'stock', 'inventory-transactions'].includes(currentView) ? 'inventory' : currentView]} items={items} onClick={selectItem} /> :
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching pages" />}
    </nav>
    <div className="workspace-sidebar-footer">
      <Button type="text" block icon={<LogOut size={18} />} onClick={logout} aria-label="Sign out">{!collapsed && 'Sign out'}</Button>
      {!collapsed && (role === 'admin' ? (
        <div className="admin-sidebar-account">
          <strong>Administration</strong>
          <span>{user?.userName || user?.username || 'Admin'}</span>
        </div>
      ) : <span>National Engineering College</span>)}
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
