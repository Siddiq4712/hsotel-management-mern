import React from 'react';
import { Avatar, Button, Dropdown } from 'antd';
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import NotificationBell from './NotificationBell';

const Header = ({ onMenuClick, onCollapse, isCollapsed, sidebarOpen, workspace, onWorkspaceChange }) => {
  const { user, logout } = useAuth();
  const name = user?.userName || user?.username || 'My account';
  const role = workspace || user?.role || 'Hostel';
  return (
    <header className="workspace-header">
      <div className="workspace-brand">
        {user?.role !== 'parent' && <>
          <Button type="text" className="workspace-mobile-toggle" aria-label="Open navigation" aria-expanded={!!sidebarOpen} aria-controls="workspace-mobile-navigation" icon={<Menu size={21} />} onClick={onMenuClick} />
          <Button type="text" className="workspace-desktop-toggle" aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!isCollapsed} aria-controls="workspace-desktop-navigation" icon={isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />} onClick={onCollapse} />
        </>}
        <img className="workspace-brand-mark" src="/nec-logo.png" alt="National Engineering College logo" />
        <div className="workspace-brand-copy">
          <span className="workspace-college">National Engineering College</span>
          <span className="workspace-product">Hostel Management <span className="workspace-portal">{role} portal</span></span>
        </div>
      </div>
      <div className="workspace-header-actions">
        {user?.role === 'admin' && <WorkspaceSwitcher workspace={workspace} onChange={onWorkspaceChange} />}
        <NotificationBell key={user?.userId || user?.id} />
        <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: [
          { key: 'identity', disabled: true, label: `${name} · ${user?.role || 'Account'}` },
          { type: 'divider' },
          { key: 'logout', label: 'Sign out', icon: <LogOut size={16} />, onClick: logout },
        ] }}>
          <button type="button" className="workspace-profile" aria-label="Account menu" aria-haspopup="menu">
            <Avatar shape="square" size={36} src={user?.profileImage} icon={<User size={18} />} />
            <span className="workspace-profile-copy"><strong>{name}</strong><span>{user?.role}</span></span>
            <ChevronDown size={14} className="workspace-profile-chevron" />
          </button>
        </Dropdown>
      </div>
    </header>
  );
};
export default Header;
