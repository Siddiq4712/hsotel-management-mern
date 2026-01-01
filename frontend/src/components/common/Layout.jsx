import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children, currentView, setCurrentView }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Default to collapsed so it expands on hover
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onMenuClick={() => {
        setSidebarOpen(!sidebarOpen);
        setIsCollapsed(false); // Fully open when toggled on mobile
      }} />

      <div className="flex flex-1">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        <main 
          className={`flex-1 transition-all duration-300 pt-16 min-h-screen
            ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} 
            ${sidebarOpen ? 'max-lg:blur-sm max-lg:pointer-events-none' : ''}
          `}
        >
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;