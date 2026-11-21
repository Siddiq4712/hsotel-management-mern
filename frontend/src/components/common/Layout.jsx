import React, { useLayoutEffect, useRef, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ConfigProvider } from 'antd';
import workspaceTheme from '../../theme/workspaceTheme';
import '../../styles/workspace.css';
import '../admin/AdminWorkspace.css';

const Layout = ({ children, currentView, setCurrentView, workspace, workspaceChoices, workspaceSelection, workspaceError, onWorkspaceRetry, onWorkspaceChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('hostel-sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const toggleCollapsed = () => setIsCollapsed(current => {
    try { localStorage.setItem('hostel-sidebar-collapsed', String(!current)); } catch { /* Storage may be unavailable. */ }
    return !current;
  });
  const { user } = useAuth();
  const contentRef = useRef(null);
  const sidebarDestination = useRef(null);

  const selectSidebarPage = view => {
    sidebarDestination.current = view !== currentView ? view : null;
    setCurrentView(view);
  };

  useLayoutEffect(() => {
    const destination = sidebarDestination.current;
    sidebarDestination.current = null;
    if (destination !== currentView || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

    const animation = contentRef.current?.animate?.([{ opacity: 0.65 }, { opacity: 1 }], {
      duration: 200,
      easing: 'ease-out',
    });
    return () => animation?.cancel();
  }, [currentView]);

  const isParent = user?.role === 'parent';

  return (
    <ConfigProvider theme={workspaceTheme}>
    <div className={`workspace-ui min-h-screen bg-slate-50 flex flex-col ${workspace === 'admin' ? 'admin-workspace' : ''}`}>
      <a className="workspace-skip-link" href="#workspace-main">Skip to content</a>
      <Header isCollapsed={isCollapsed} onCollapse={toggleCollapsed} sidebarOpen={sidebarOpen} workspace={workspace} workspaceChoices={workspaceChoices} workspaceSelection={workspaceSelection} workspaceError={workspaceError} onWorkspaceRetry={onWorkspaceRetry} onWorkspaceChange={onWorkspaceChange} onMenuClick={() => {
        if (!isParent) {
          setSidebarOpen(!sidebarOpen);
        }
      }} />

      <div className="flex flex-1">
        {!isParent && (
          <Sidebar
            workspace={workspace}
            currentView={currentView}
            setCurrentView={selectSidebarPage}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            isCollapsed={isCollapsed}
          />
        )}

        <main id="workspace-main" tabIndex={-1}
          className={`workspace-main flex-1 min-w-0 transition-all duration-300 pt-16 min-h-screen
            ${isParent ? 'lg:ml-0' : (isCollapsed ? 'lg:ml-20' : 'lg:ml-72')} 
          `}
        >
          <div ref={contentRef} className="workspace-content" data-workspace={workspace || user?.role}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </ConfigProvider>
  );
};

export default Layout;
